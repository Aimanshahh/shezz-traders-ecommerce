import mongoose from 'mongoose'
import ReturnCase, { CASE_REASONS, CASE_TYPES, CASE_RESOLUTIONS, DEVICE_OUTCOMES } from '../models/ReturnCase.js'
import Sale from '../models/Sale.js'
import SaleItem from '../models/SaleItem.js'
import Warranty from '../models/Warranty.js'
import Device from '../models/Device.js'
import DeviceHistory from '../models/DeviceHistory.js'
import Customer from '../models/Customer.js'
import Counter from '../models/Counter.js'
import { validateImei } from '../utils/Imei.js'
import { warrantyState } from '../utils/saleInfo.js'
import { outstandingOf } from '../utils/Ledger.js'

const round2 = (n) => Math.round(n * 100) / 100
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const adminName = (req) => req.admin?.name || req.admin?.username || req.admin?.email || ''

class CaseError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

let collectionsReady = false
async function ensureCollections() {
  if (collectionsReady) return
  await Promise.all([ReturnCase, Counter, DeviceHistory, Warranty].map((model) => model.createCollection().catch(() => {})))
  collectionsReady = true
}

async function latestSaleForDevice(deviceId, session) {
  const item = await SaleItem.findOne({ device: deviceId }).sort({ createdAt: -1 }).session(session).lean()
  if (item) {
    const sale = await Sale.findOne({ _id: item.sale, status: 'completed' }).session(session)
    if (sale) return { item, sale }
  }
  const replacementCase = await ReturnCase.findOne({
    replacementDevice: deviceId,
    status: 'resolved',
    resolution: 'replacement',
  }).sort({ resolvedAt: -1 }).session(session).lean()
  if (!replacementCase) return null
  const sale = await Sale.findOne({ _id: replacementCase.sale, status: 'completed' }).session(session)
  const replacementItem = await SaleItem.findById(replacementCase.saleItem).session(session).lean()
  return sale && replacementItem ? { item: replacementItem, sale } : null
}

export async function lookupReturnDevice(req, res, next) {
  try {
    const checked = validateImei(req.query.imei)
    if (!checked.valid) return res.status(400).json({ ok: false, message: checked.reason })
    const device = await Device.findOne({ imei: checked.imei }).populate('holder', 'name phone').lean()
    if (!device) return res.status(404).json({ ok: false, message: 'Device not found in inventory' })
    const saleInfo = await latestSaleForDevice(device._id)
    if (!saleInfo) return res.status(400).json({ ok: false, message: 'This device has no active invoice to return against' })
    const [warranty, openCase] = await Promise.all([
      Warranty.findOne({ device: device._id, sale: saleInfo.sale._id }).sort({ createdAt: -1 }).lean(),
      ReturnCase.findOne({ device: device._id, status: 'open' }).select('caseNumber').lean(),
    ])
    res.json({
      ok: true,
      device: { _id: device._id, imei: device.imei, status: device.status, holder: device.holder },
      sale: {
        _id: saleInfo.sale._id,
        invoiceNumber: saleInfo.sale.invoiceNumber,
        customer: saleInfo.sale.customer,
        customerSnapshot: saleInfo.sale.customerSnapshot,
        total: saleInfo.sale.total,
        subtotal: saleInfo.sale.subtotal,
        amountPaid: saleInfo.sale.amountPaid,
        paidLater: saleInfo.sale.paidLater,
        returnedAmount: saleInfo.sale.returnedAmount || 0,
        refundedAmount: saleInfo.sale.refundedAmount || 0,
        item: { _id: saleInfo.item._id, unitPrice: saleInfo.item.unitPrice, productName: saleInfo.item.productName },
      },
      warranty: warrantyState(warranty),
      openCase,
    })
  } catch (err) {
    next(err)
  }
}

export async function listReturnCases(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100)
    const filter = {}
    if (['open', 'resolved', 'cancelled'].includes(req.query.status)) filter.status = req.query.status
    if (req.query.q) {
      const rx = { $regex: escapeRegex(String(req.query.q).trim()), $options: 'i' }
      filter.$or = [{ caseNumber: rx }, { imei: rx }, { invoiceNumber: rx }, { holderName: rx }]
    }
    const [cases, total, openCount] = await Promise.all([
      ReturnCase.find(filter).populate('customer', 'name phone').sort({ openedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ReturnCase.countDocuments(filter),
      ReturnCase.countDocuments({ status: 'open' }),
    ])
    res.json({ ok: true, cases, total, openCount, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
}

export async function getReturnCase(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ ok: false, message: 'Invalid case id' })
    const returnCase = await ReturnCase.findById(req.params.id)
      .populate('customer', 'name phone city')
      .populate('holder', 'name phone')
      .populate('replacementDevice', 'imei status')
      .lean()
    if (!returnCase) return res.status(404).json({ ok: false, message: 'Return case not found' })
    const sale = await Sale.findById(returnCase.sale)
      .select('amountPaid paidLater refundedAmount returnedAmount total')
      .lean()
    const refundableLimit = sale
      ? Math.max(0, round2(sale.amountPaid + (sale.paidLater || 0) - (sale.refundedAmount || 0)))
      : 0
    res.json({ ok: true, returnCase, refundableLimit })
  } catch (err) {
    next(err)
  }
}

export async function openReturnCase(req, res, next) {
  const session = await mongoose.startSession()
  try {
    await ensureCollections()
    const checked = validateImei(req.body.imei)
    if (!checked.valid) return res.status(400).json({ ok: false, message: checked.reason })
    const type = req.body.type || 'warranty_claim'
    const reason = req.body.reason || 'not_working'
    if (!CASE_TYPES.includes(type)) return res.status(400).json({ ok: false, message: 'Invalid case type' })
    if (!CASE_REASONS.includes(reason)) return res.status(400).json({ ok: false, message: 'Invalid case reason' })

    let created
    await session.withTransaction(async () => {
      const device = await Device.findOne({ imei: checked.imei }).session(session)
      if (!device) throw new CaseError('Device not found in inventory', 404)
      if (device.status !== 'sold') throw new CaseError(`Only sold devices can be returned (current status: ${device.status})`)
      if (await ReturnCase.exists({ device: device._id, status: 'open' }).session(session)) {
        throw new CaseError('There is already an open case for this device', 409)
      }
      const info = await latestSaleForDevice(device._id, session)
      if (!info) throw new CaseError('This device has no active invoice to return against')
      const warranty = await Warranty.findOne({ device: device._id, sale: info.sale._id }).sort({ createdAt: -1 }).session(session).lean()
      const warrantyInfo = warrantyState(warranty)
      if (type === 'warranty_claim' && warrantyInfo?.state !== 'active' && warrantyInfo?.state !== 'expiring_soon') {
        throw new CaseError('The device is outside its warranty period; open a return instead')
      }
      const holder = device.holder || info.sale.customer
      const customer = await Customer.findById(holder).session(session).lean()
      const counter = await Counter.findOneAndUpdate(
        { _id: 'return-case' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
      )
      ;[created] = await ReturnCase.create([{
        caseNumber: `RET-${1000 + counter.seq}`,
        type,
        reason,
        notes: String(req.body.notes ?? '').slice(0, 1000),
        device: device._id,
        imei: device.imei,
        productName: info.item.productName || '',
        sale: info.sale._id,
        saleItem: info.item._id,
        invoiceNumber: info.sale.invoiceNumber,
        itemValue: round2(info.item.unitPrice * (info.sale.subtotal > 0 ? info.sale.total / info.sale.subtotal : 0)),
        customer: info.sale.customer,
        holder,
        holderName: customer?.name || info.sale.customerSnapshot?.name || '',
        warranty: {
          status: warrantyInfo?.state || 'expired',
          startDate: warranty?.startDate || null,
          endDate: warranty?.endDate || null,
          months: warranty?.months || 0,
        },
        createdBy: req.admin?._id || null,
        createdByName: adminName(req),
      }], { session })

      const changed = await Device.updateOne({ _id: device._id, status: 'sold' }, { $set: { status: 'returned' } }, { session })
      if (changed.modifiedCount !== 1) throw new CaseError('Device status changed. Refresh and try again', 409)
      await DeviceHistory.create([{
        device: device._id,
        imei: device.imei,
        action: 'return_opened',
        fromStatus: 'sold',
        toStatus: 'returned',
        note: `${created.caseNumber} opened against ${info.sale.invoiceNumber}`,
        meta: { returnCase: String(created._id), invoice: info.sale.invoiceNumber },
        performedBy: req.admin?._id || null,
        performedByName: adminName(req),
      }], { session })
    })
    res.status(201).json({ ok: true, returnCase: created })
  } catch (err) {
    if (err instanceof CaseError) return res.status(err.status).json({ ok: false, message: err.message })
    if (err.code === 11000) return res.status(409).json({ ok: false, message: 'There is already an open case for this device' })
    next(err)
  } finally {
    session.endSession()
  }
}

export async function resolveReturnCase(req, res, next) {
  const session = await mongoose.startSession()
  try {
    await ensureCollections()
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ ok: false, message: 'Invalid case id' })
    const resolution = req.body.resolution
    if (!CASE_RESOLUTIONS.includes(resolution)) return res.status(400).json({ ok: false, message: 'Choose a valid resolution' })
    let updated
    await session.withTransaction(async () => {
      const returnCase = await ReturnCase.findById(req.params.id).session(session)
      if (!returnCase) throw new CaseError('Return case not found', 404)
      if (returnCase.status !== 'open') throw new CaseError('This case is no longer open', 409)
      const device = await Device.findById(returnCase.device).session(session)
      const sale = await Sale.findById(returnCase.sale).session(session)
      const saleItem = await SaleItem.findById(returnCase.saleItem).session(session)
      if (!device || !sale || !saleItem) throw new CaseError('The original device or invoice is missing', 409)

      const now = new Date()
      let creditAmount = 0
      let refundAmount = 0
      let replacement = null
      let outcome = req.body.deviceOutcome || 'faulty'
      if (!DEVICE_OUTCOMES.includes(outcome)) throw new CaseError('Choose a valid device outcome')

      if (resolution === 'refund') {
        const discountedLineValue = sale.subtotal > 0 ? saleItem.unitPrice * (sale.total / sale.subtotal) : 0
        const requestedCredit = req.body.creditAmount === undefined || req.body.creditAmount === ''
          ? discountedLineValue
          : Number(req.body.creditAmount)
        creditAmount = round2(requestedCredit)
        if (!Number.isFinite(creditAmount) || creditAmount <= 0) throw new CaseError('Enter a return credit greater than zero')
        if (creditAmount > round2(sale.total - (sale.returnedAmount || 0)) + 0.001 || creditAmount > discountedLineValue + 0.01) {
          throw new CaseError('Return credit exceeds the remaining invoice or device value')
        }
        refundAmount = round2(Number(req.body.refundAmount || 0))
        const collected = round2(sale.amountPaid + (sale.paidLater || 0) - (sale.refundedAmount || 0))
        if (!Number.isFinite(refundAmount) || refundAmount < 0 || refundAmount > Math.min(creditAmount, collected) + 0.001) {
          throw new CaseError(`Cash refund cannot exceed the ${Math.max(0, Math.min(creditAmount, collected))} collected for this invoice`)
        }
        sale.returnedAmount = round2((sale.returnedAmount || 0) + creditAmount)
        sale.refundedAmount = round2((sale.refundedAmount || 0) + refundAmount)
        sale.paymentStatus = outstandingOf(sale) <= 0.001 ? 'paid' : sale.amountPaid + (sale.paidLater || 0) - sale.refundedAmount <= 0 ? 'unpaid' : 'partial'
        await sale.save({ session })
        outcome = req.body.deviceOutcome || 'available'
      }

      if (resolution === 'replacement') {
        const checked = validateImei(req.body.replacementImei)
        if (!checked.valid) throw new CaseError(`Replacement device: ${checked.reason}`)
        if (checked.imei === device.imei) throw new CaseError('Choose a different device as the replacement')
        replacement = await Device.findOne({ imei: checked.imei, status: 'available' }).session(session)
        if (!replacement) throw new CaseError('Replacement IMEI is not available in inventory', 409)
        const claimed = await Device.updateOne(
          { _id: replacement._id, status: 'available' },
          { $set: { status: 'sold', holder: returnCase.holder, replaces: device._id } },
          { session }
        )
        if (claimed.modifiedCount !== 1) throw new CaseError('Replacement device was just assigned. Scan another', 409)
        device.replacedBy = replacement._id
        outcome = req.body.deviceOutcome || 'faulty'
        const originalWarranty = await Warranty.findOne({ device: device._id, sale: sale._id }).sort({ createdAt: -1 }).session(session)
        if (originalWarranty) {
          originalWarranty.status = 'void'
          await originalWarranty.save({ session })
          await Warranty.create([{
            device: replacement._id,
            sale: sale._id,
            customer: sale.customer,
            startDate: now,
            endDate: originalWarranty.endDate,
            months: originalWarranty.months,
            status: 'active',
            policy: originalWarranty.policy,
          }], { session })
        }
        await DeviceHistory.create([{
          device: replacement._id,
          imei: replacement.imei,
          action: 'replacement_issued',
          fromStatus: 'available',
          toStatus: 'sold',
          note: `Issued as replacement for ${device.imei} under ${returnCase.caseNumber}`,
          meta: { returnCase: String(returnCase._id), replaces: String(device._id) },
          performedBy: req.admin?._id || null,
          performedByName: adminName(req),
        }], { session })
      }

      if (!['faulty', 'available', 'deactivated'].includes(outcome)) throw new CaseError('Choose a valid outcome for the returned device')
      const returnedToCustomer = resolution === 'repaired' || resolution === 'rejected'
      device.status = returnedToCustomer ? 'sold' : outcome
      if (!returnedToCustomer) device.holder = null
      await device.save({ session })
      const oldWarranty = await Warranty.findOne({ device: device._id, sale: sale._id }).sort({ createdAt: -1 }).session(session)
      if (oldWarranty && ['refund', 'replacement'].includes(resolution)) {
        oldWarranty.status = 'void'
        await oldWarranty.save({ session })
      }
      returnCase.status = 'resolved'
      returnCase.resolution = resolution
      returnCase.deviceOutcome = device.status
      returnCase.replacementDevice = replacement?._id || null
      returnCase.creditAmount = creditAmount
      returnCase.refundAmount = refundAmount
      returnCase.refundMethod = req.body.refundMethod || 'cash'
      returnCase.resolutionNote = String(req.body.resolutionNote ?? '').slice(0, 1000)
      returnCase.resolvedAt = now
      returnCase.resolvedBy = req.admin?._id || null
      returnCase.resolvedByName = adminName(req)
      await returnCase.save({ session })
      await DeviceHistory.create([{
        device: device._id,
        imei: device.imei,
        action: 'return_resolved',
        fromStatus: 'returned',
        toStatus: device.status,
        note: `${returnCase.caseNumber} resolved: ${resolution}${replacement ? ` with ${replacement.imei}` : ''}`,
        meta: { returnCase: String(returnCase._id), resolution, replacement: replacement?.imei || null, creditAmount, refundAmount },
        performedBy: req.admin?._id || null,
        performedByName: adminName(req),
      }], { session })
      updated = returnCase
    })
    res.json({ ok: true, returnCase: updated })
  } catch (err) {
    if (err instanceof CaseError) return res.status(err.status).json({ ok: false, message: err.message })
    next(err)
  } finally {
    session.endSession()
  }
}

export async function cancelReturnCase(req, res, next) {
  const session = await mongoose.startSession()
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ ok: false, message: 'Invalid case id' })
    let updated
    await session.withTransaction(async () => {
      const returnCase = await ReturnCase.findById(req.params.id).session(session)
      if (!returnCase) throw new CaseError('Return case not found', 404)
      if (returnCase.status !== 'open') throw new CaseError('Only open cases can be cancelled', 409)
      const device = await Device.findById(returnCase.device).session(session)
      if (!device || device.status !== 'returned') throw new CaseError('Device status changed; cannot cancel this case', 409)
      device.status = 'sold'
      device.holder = returnCase.holder
      await device.save({ session })
      returnCase.status = 'cancelled'
      returnCase.cancelledAt = new Date()
      returnCase.cancelledByName = adminName(req)
      await returnCase.save({ session })
      await DeviceHistory.create([{
        device: device._id,
        imei: device.imei,
        action: 'return_cancelled',
        fromStatus: 'returned',
        toStatus: 'sold',
        note: `${returnCase.caseNumber} cancelled; returned to ${returnCase.holderName}`,
        meta: { returnCase: String(returnCase._id) },
        performedBy: req.admin?._id || null,
        performedByName: adminName(req),
      }], { session })
      updated = returnCase
    })
    res.json({ ok: true, returnCase: updated })
  } catch (err) {
    if (err instanceof CaseError) return res.status(err.status).json({ ok: false, message: err.message })
    next(err)
  } finally {
    session.endSession()
  }
}
