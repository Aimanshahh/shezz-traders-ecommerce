import mongoose from 'mongoose'
import Sale, { SALE_SOURCES, PAYMENT_METHODS } from '../models/Sale.js'
import SaleItem from '../models/SaleItem.js'
import Warranty from '../models/Warranty.js'
import Customer from '../models/Customer.js'
import Counter from '../models/Counter.js'
import Device from '../models/Device.js'
import DeviceHistory from '../models/DeviceHistory.js'
import { getSettings } from '../models/CrmSettings.js'
import { validateImei } from '../utils/Imei.js'
import { addMonths } from '../utils/dates.js'

const round2 = (n) => Math.round(n * 100) / 100

class ReviewError extends Error {
  constructor(message, status = 409) {
    super(message)
    this.status = status
  }
}

// POST /api/sales/:id/approve
// Turns a salesperson submission into a real invoice. Prices are the rates stored on
// the submission; the admin may correct a line, the discount or the payment here and
// every total is recalculated on the server. Inventory only moves at this moment.
export async function approveSale(req, res, next) {
  const session = await mongoose.startSession()
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid sale id' })
    }
    const sale = await Sale.findById(req.params.id).lean()
    if (!sale) return res.status(404).json({ ok: false, message: 'Sale not found' })
    if (sale.status !== 'pending') {
      return res.status(400).json({ ok: false, message: `This sale is already ${sale.status}` })
    }
    if (!sale.salesperson) {
      return res.status(400).json({ ok: false, message: 'Only submitted sales can be approved here' })
    }

    const storedItems = await SaleItem.find({ sale: sale._id }).lean()
    if (!storedItems.length) {
      return res.status(400).json({ ok: false, message: 'This sale has no devices' })
    }

    const body = req.body || {}
    const corrections = new Map()
    for (const raw of Array.isArray(body.items) ? body.items : []) {
      const r = validateImei(raw?.imei)
      if (!r.valid) {
        return res.status(400).json({ ok: false, message: `${raw?.imei ?? 'IMEI'}: ${r.reason}` })
      }
      const price = Number(raw?.unitPrice)
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ ok: false, message: `Enter a valid price for ${r.imei}` })
      }
      corrections.set(r.imei, round2(price))
    }

    const lines = storedItems.map((i) => ({
      ...i,
      unitPrice: corrections.has(i.imei) ? corrections.get(i.imei) : round2(Number(i.unitPrice) || 0),
    }))
    const subtotal = round2(lines.reduce((sum, i) => sum + i.unitPrice, 0))
    const discount = round2(Number(body.discount ?? sale.discount ?? 0))
    if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
      return res.status(400).json({ ok: false, message: 'Discount must be between 0 and the subtotal' })
    }
    const total = round2(subtotal - discount)

    let amountPaid = total
    if (body.amountPaid !== undefined && body.amountPaid !== null && body.amountPaid !== '') {
      amountPaid = round2(Number(body.amountPaid))
      if (!Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > total) {
        return res.status(400).json({ ok: false, message: 'Amount paid must be between 0 and the total' })
      }
    }
    const paymentStatus = amountPaid >= total ? 'paid' : amountPaid === 0 ? 'unpaid' : 'partial'

    const paymentMethod = body.paymentMethod || sale.paymentMethod || 'cash'
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ ok: false, message: 'Invalid payment method' })
    }
    const source = body.source || sale.source || 'offline'
    if (!SALE_SOURCES.includes(source)) {
      return res.status(400).json({ ok: false, message: 'Invalid sale source' })
    }

    let dueDate = null
    if (body.dueDate && paymentStatus !== 'paid') {
      dueDate = new Date(`${String(body.dueDate).slice(0, 10)}T23:59:59`)
      if (Number.isNaN(dueDate.getTime())) {
        return res.status(400).json({ ok: false, message: 'Invalid payment due date' })
      }
    }

    const customer = await Customer.findById(sale.customer).select('name').lean()
    if (!customer) return res.status(404).json({ ok: false, message: 'Customer not found' })

    const settings = await getSettings()
    const adminName = req.admin?.name || req.admin?.username || req.admin?.email || ''
    let invoiceNumber = ''

    await session.withTransaction(async () => {
      const ids = lines.map((l) => l.device)
      const devices = await Device.find({ _id: { $in: ids } }).session(session).lean()
      const byId = new Map(devices.map((d) => [String(d._id), d]))

      const problems = []
      lines.forEach((l) => {
        const d = byId.get(String(l.device))
        if (!d) problems.push(`${l.imei} (no longer in inventory)`)
        else if (d.status !== 'available') problems.push(`${l.imei} (${d.status})`)
      })
      if (problems.length) {
        const shown = problems.slice(0, 5).join(', ')
        const more = problems.length > 5 ? ` and ${problems.length - 5} more` : ''
        throw new ReviewError(`These devices cannot be approved: ${shown}${more}`, 409)
      }

      const claim = await Device.updateMany(
        { _id: { $in: ids }, status: 'available' },
        { $set: { status: 'sold', holder: sale.customer } },
        { session }
      )
      if (claim.modifiedCount !== ids.length) {
        throw new ReviewError('Some devices were just sold elsewhere. Reject or edit this sale.', 409)
      }

      const counter = await Counter.findOneAndUpdate(
        { _id: 'invoice' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
      )
      invoiceNumber = `${settings.invoicePrefix}${1000 + counter.seq}`

      for (const line of lines) {
        await SaleItem.updateOne(
          { _id: line._id },
          { $set: { unitPrice: line.unitPrice, total: line.unitPrice } },
          { session }
        )
      }

      const moved = await Sale.updateOne(
        { _id: sale._id, status: 'pending' },
        {
          $set: {
            invoiceNumber,
            subtotal,
            discount,
            total,
            amountPaid,
            paymentStatus,
            dueDate,
            paymentMethod,
            source,
            status: 'completed',
            notes: body.notes !== undefined ? String(body.notes).slice(0, 1000) : sale.notes,
            soldBy: req.admin?._id || null,
            soldByName: adminName,
            reviewedBy: req.admin?._id || null,
            reviewedByName: adminName,
            reviewedAt: new Date(),
            reviewNotes: String(body.reviewNotes ?? '').slice(0, 1000),
          },
        },
        { session }
      )
      if (moved.modifiedCount !== 1) {
        throw new ReviewError('This sale was already reviewed by someone else', 409)
      }

      const endDate = addMonths(sale.saleDate, settings.warrantyMonths)
      await Warranty.insertMany(
        devices.map((d) => ({
          device: d._id,
          sale: sale._id,
          customer: sale.customer,
          startDate: sale.saleDate,
          endDate,
          months: settings.warrantyMonths,
          status: 'active',
          policy: 'standard',
        })),
        { session }
      )

      await DeviceHistory.insertMany(
        devices.flatMap((d) => [
          {
            device: d._id,
            imei: d.imei,
            action: 'sold',
            fromStatus: 'available',
            toStatus: 'sold',
            note: `Sold on ${invoiceNumber} to ${customer.name} (submitted by ${sale.salespersonName || 'salesperson'})`,
            meta: { invoice: invoiceNumber, sale: String(sale._id) },
            performedBy: req.admin?._id || null,
            performedByName: adminName,
          },
          {
            device: d._id,
            imei: d.imei,
            action: 'warranty_created',
            note: `${settings.warrantyMonths}-month warranty until ${endDate.toISOString().slice(0, 10)}`,
            meta: { invoice: invoiceNumber },
            performedBy: req.admin?._id || null,
            performedByName: adminName,
          },
        ]),
        { session }
      )
    })

    res.json({ ok: true, sale: { _id: sale._id, invoiceNumber } })
  } catch (err) {
    if (err instanceof ReviewError) {
      return res.status(err.status).json({ ok: false, message: err.message })
    }
    next(err)
  } finally {
    session.endSession()
  }
}

// POST /api/sales/:id/reject
// Refuses a submission. The devices were never marked sold, so inventory is untouched.
export async function rejectSale(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid sale id' })
    }
    const reason = String(req.body?.reason ?? '').trim().slice(0, 1000)
    const adminName = req.admin?.name || req.admin?.username || req.admin?.email || ''

    const sale = await Sale.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        $set: {
          status: 'rejected',
          rejectionReason: reason,
          reviewedBy: req.admin?._id || null,
          reviewedByName: adminName,
          reviewedAt: new Date(),
          reviewNotes: String(req.body?.reviewNotes ?? '').slice(0, 1000),
        },
      },
      { new: true }
    ).lean()

    if (!sale) {
      const exists = await Sale.exists({ _id: req.params.id })
      return res.status(exists ? 400 : 404).json({
        ok: false,
        message: exists ? 'This sale has already been reviewed' : 'Sale not found',
      })
    }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
