import mongoose from 'mongoose'
import Sale, { SALE_SOURCES, PAYMENT_METHODS } from '../models/Sale.js'
import SaleItem from '../models/SaleItem.js'
import Warranty from '../models/Warranty.js'
import Customer from '../models/Customer.js'
import Counter from '../models/Counter.js'
import Device from '../models/Device.js'
import DeviceHistory from '../models/DeviceHistory.js'
import Box from '../models/Box.js'
import Product from '../models/Product.js'
import { getSettings } from '../models/CrmSettings.js'
import { validateImei } from '../utils/Imei.js'
import { normalizeBoxCode } from '../utils/boxCode.js'
import { normalizePhone, isValidPhone } from '../utils/phone.js'
import { addMonths } from '../utils/dates.js'
import Payment from '../models/Payment.js'
import Transfer from '../models/Transfer.js'
import ReturnCase from '../models/ReturnCase.js'
import { saleInfoFor, warrantyState } from '../utils/saleInfo.js'

const MAX_ITEMS = 500
const round2 = (n) => Math.round(n * 100) / 100
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

class SaleError extends Error {
  constructor(message, status = 409) {
    super(message)
    this.status = status
  }
}

// Transactions cannot create collections on older servers, so make sure they exist once.
let collectionsReady = false
async function ensureCollections() {
  if (collectionsReady) return
  await Promise.all(
    [Sale, SaleItem, Warranty, Customer, Counter, DeviceHistory].map((m) =>
      m.createCollection().catch(() => {})
    )
  )
  collectionsReady = true
}

// POST /api/sales/resolve  { code }
// Turns a scanned IMEI, box code or carton code into devices and says which can be sold.
export async function resolveCode(req, res, next) {
  try {
    const raw = String(req.body.code ?? '').trim()
    if (!raw) return res.status(400).json({ ok: false, message: 'Nothing scanned' })

    let kind
    let label = raw
    let devices = []

    if (/^\d+$/.test(raw)) {
      const r = validateImei(raw)
      if (!r.valid) return res.json({ ok: true, kind: 'invalid', message: r.reason })
      const d = await Device.findOne({ imei: r.imei })
        .populate('product', 'name price')
        .populate('box', 'code')
        .lean()
      if (!d) {
        return res.json({ ok: true, kind: 'not_found', message: 'Device not registered in inventory' })
      }
      kind = 'device'
      label = d.imei
      devices = [d]
    } else {
      const box = await Box.findOne({ code: normalizeBoxCode(raw) }).lean()
      if (!box) {
        return res.json({
          ok: true,
          kind: 'not_found',
          message: 'No device, box or carton has this code',
        })
      }
      kind = box.type
      label = box.code
      let boxIds = [box._id]
      if (box.type === 'carton') {
        const kids = await Box.find({ parent: box._id }).select('_id').lean()
        boxIds = kids.map((k) => k._id)
      }
      devices = await Device.find({ box: { $in: boxIds } })
        .populate('product', 'name price')
        .populate('box', 'code')
        .sort({ imei: 1 })
        .lean()
    }

    const soldIds = devices.filter((d) => d.status !== 'available').map((d) => d._id)
    const info = await saleInfoFor(soldIds)

    const items = devices.map((d) => ({
      _id: d._id,
      imei: d.imei,
      status: d.status,
      available: d.status === 'available',
      product: d.product ? { _id: d.product._id, name: d.product.name, price: d.product.price } : null,
      box: d.box?.code || null,
      sale: info.get(String(d._id)) || null,
    }))

    res.json({
      ok: true,
      kind,
      label,
      items,
      counts: { total: items.length, available: items.filter((i) => i.available).length },
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/sales
// Completes a sale in one transaction: devices -> sold, customer, invoice, items,
// warranties and history. If anything fails, nothing is saved.
export async function completeSale(req, res, next) {
  const session = await mongoose.startSession()
  try {
    await ensureCollections()
    const body = req.body || {}

    // ── validate input ─────────────────────────────────────
    const rawItems = Array.isArray(body.items) ? body.items : []
    if (rawItems.length === 0) {
      return res.status(400).json({ ok: false, message: 'Add at least one device to the sale' })
    }
    if (rawItems.length > MAX_ITEMS) {
      return res.status(400).json({ ok: false, message: `Maximum ${MAX_ITEMS} devices per sale` })
    }
    const seen = new Set()
    const items = []
    for (const it of rawItems) {
      const r = validateImei(it?.imei)
      if (!r.valid) {
        return res.status(400).json({ ok: false, message: `${it?.imei ?? 'IMEI'}: ${r.reason}` })
      }
      if (seen.has(r.imei)) {
        return res.status(400).json({ ok: false, message: `${r.imei} is on the sale twice` })
      }
      seen.add(r.imei)
      const price = Number(it.unitPrice)
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ ok: false, message: `Enter a valid price for ${r.imei}` })
      }
      items.push({ imei: r.imei, unitPrice: round2(price) })
    }

    let customerInput = null
    if (!body.customerId) {
      const name = String(body.customer?.name ?? '').trim()
      const phone = normalizePhone(body.customer?.phone)
      if (!name) return res.status(400).json({ ok: false, message: 'Customer name is required' })
      if (!isValidPhone(phone)) {
        return res.status(400).json({ ok: false, message: 'Enter a valid customer phone number' })
      }
      customerInput = {
        name,
        phone,
        city: String(body.customer?.city ?? '').trim(),
        address: String(body.customer?.address ?? '').trim(),
      }
    } else if (!mongoose.isValidObjectId(body.customerId)) {
      return res.status(400).json({ ok: false, message: 'Invalid customer' })
    }

    const subtotal = round2(items.reduce((sum, i) => sum + i.unitPrice, 0))
    const discount = round2(Number(body.discount || 0))
    if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
      return res.status(400).json({ ok: false, message: 'Discount must be between 0 and the subtotal' })
    }
    const total = round2(subtotal - discount)

    const paymentMethod = body.paymentMethod || 'cash'
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ ok: false, message: 'Invalid payment method' })
    }
    const source = body.source || 'offline'
    if (!SALE_SOURCES.includes(source)) {
      return res.status(400).json({ ok: false, message: 'Invalid sale source' })
    }
    let amountPaid = total
    if (body.amountPaid !== undefined && body.amountPaid !== null && body.amountPaid !== '') {
      amountPaid = round2(Number(body.amountPaid))
      if (!Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > total) {
        return res.status(400).json({ ok: false, message: 'Amount paid must be between 0 and the total' })
      }
    }
    const paymentStatus = amountPaid >= total ? 'paid' : amountPaid === 0 ? 'unpaid' : 'partial'

    let saleDate = new Date()
    if (body.saleDate) {
      saleDate = new Date(body.saleDate)
      if (Number.isNaN(saleDate.getTime())) {
        return res.status(400).json({ ok: false, message: 'Invalid sale date' })
      }
    }

    const settings = await getSettings()
    const adminName = req.admin?.name || req.admin?.username || req.admin?.email || ''
    let saleId = null
    let invoiceNumber = ''

    // ── one transaction ────────────────────────────────────
    await session.withTransaction(async () => {
      const imeis = items.map((i) => i.imei)
      const devices = await Device.find({ imei: { $in: imeis } }).session(session).lean()
      const byImei = new Map(devices.map((d) => [d.imei, d]))

      const problems = []
      imeis.forEach((imei) => {
        const d = byImei.get(imei)
        if (!d) problems.push(`${imei} (not in inventory)`)
        else if (d.status !== 'available') problems.push(`${imei} (${d.status})`)
      })
      if (problems.length) {
        const shown = problems.slice(0, 5).join(', ')
        const more = problems.length > 5 ? ` and ${problems.length - 5} more` : ''
        throw new SaleError(`These devices cannot be sold: ${shown}${more}`)
      }

      const ids = devices.map((d) => d._id)
      const claim = await Device.updateMany(
        { _id: { $in: ids }, status: 'available' },
        { $set: { status: 'sold' } },
        { session }
      )
      if (claim.modifiedCount !== ids.length) {
        throw new SaleError('Some devices were just sold by someone else. Scan them again.')
      }

      // customer
      let customer
      if (body.customerId) {
        customer = await Customer.findById(body.customerId).session(session)
        if (!customer) throw new SaleError('Customer not found', 404)
      } else {
        customer = await Customer.findOne({ phone: customerInput.phone }).session(session)
        if (!customer) {
          ;[customer] = await Customer.create(
            [{ ...customerInput, createdBy: req.admin?._id || null }],
            { session }
          )
        } else {
          let changed = false
          if (!customer.city && customerInput.city) {
            customer.city = customerInput.city
            changed = true
          }
          if (!customer.address && customerInput.address) {
            customer.address = customerInput.address
            changed = true
          }
          if (changed) await customer.save({ session })
        }
      }

      // the buyer now holds these devices
      await Device.updateMany({ _id: { $in: ids } }, { $set: { holder: customer._id } }, { session })

      // invoice number
      const counter = await Counter.findOneAndUpdate(
        { _id: 'invoice' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
      )
      invoiceNumber = `${settings.invoicePrefix}${1000 + counter.seq}`

      const [sale] = await Sale.create(
        [
          {
            invoiceNumber,
            customer: customer._id,
            customerSnapshot: {
              name: customer.name,
              phone: customer.phone,
              city: customer.city,
              address: customer.address,
            },
            source,
            itemCount: items.length,
            subtotal,
            discount,
            total,
            amountPaid,
            paymentStatus,
            paymentMethod,
            saleDate,
            soldBy: req.admin?._id || null,
            soldByName: adminName,
            warrantyMonths: settings.warrantyMonths,
            notes: String(body.notes ?? '').slice(0, 1000),
          },
        ],
        { session }
      )
      saleId = sale._id

      // product names and box codes for the invoice rows
      const productIds = [...new Set(devices.map((d) => d.product).filter(Boolean).map(String))]
      const boxIds = [...new Set(devices.map((d) => d.box).filter(Boolean).map(String))]
      const [products, boxes] = await Promise.all([
        Product.find({ _id: { $in: productIds } }).select('name').lean(),
        Box.find({ _id: { $in: boxIds } }).select('code').lean(),
      ])
      const productName = new Map(products.map((p) => [String(p._id), p.name]))
      const boxCode = new Map(boxes.map((b) => [String(b._id), b.code]))
      const priceOf = new Map(items.map((i) => [i.imei, i.unitPrice]))

      await SaleItem.insertMany(
        devices.map((d) => ({
          sale: sale._id,
          device: d._id,
          imei: d.imei,
          product: d.product || null,
          productName: d.product ? productName.get(String(d.product)) || '' : '',
          box: d.box || null,
          boxCode: d.box ? boxCode.get(String(d.box)) || '' : '',
          unitPrice: priceOf.get(d.imei),
          total: priceOf.get(d.imei),
        })),
        { session }
      )

      const endDate = addMonths(saleDate, settings.warrantyMonths)
      await Warranty.insertMany(
        devices.map((d) => ({
          device: d._id,
          sale: sale._id,
          customer: customer._id,
          startDate: saleDate,
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
            note: `Sold on ${invoiceNumber} to ${customer.name}`,
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

    res.status(201).json({ ok: true, sale: { _id: saleId, invoiceNumber } })
  } catch (err) {
    if (err instanceof SaleError) {
      return res.status(err.status).json({ ok: false, message: err.message })
    }
    next(err)
  } finally {
    session.endSession()
  }
}

// GET /api/sales?q=&from=&to=&page=&limit=
export async function listSales(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100)
    const filter = {}

    if (req.query.q) {
      const q = String(req.query.q).trim()
      const rx = { $regex: escapeRegex(q), $options: 'i' }
      const byImei = await SaleItem.find({ imei: { $regex: escapeRegex(q) } }).distinct('sale')
      filter.$or = [
        { invoiceNumber: rx },
        { 'customerSnapshot.name': rx },
        { 'customerSnapshot.phone': rx },
        ...(byImei.length ? [{ _id: { $in: byImei } }] : []),
      ]
    }
    if (req.query.from || req.query.to) {
      filter.saleDate = {}
      if (req.query.from) filter.saleDate.$gte = new Date(`${req.query.from}T00:00:00`)
      if (req.query.to) filter.saleDate.$lte = new Date(`${req.query.to}T23:59:59.999`)
    }

    const [sales, total, agg] = await Promise.all([
      Sale.find(filter).sort({ saleDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Sale.countDocuments(filter),
      Sale.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            revenue: { $sum: { $subtract: ['$total', { $ifNull: ['$returnedAmount', 0] }] } },
            devices: { $sum: '$itemCount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ])
    const totals = agg[0] || { revenue: 0, devices: 0, count: 0 }
    res.json({
      ok: true,
      sales,
      total,
      page,
      pages: Math.ceil(total / limit),
      totals: { revenue: totals.revenue, devices: totals.devices, count: totals.count },
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/sales/:id   (everything the invoice page needs)
export async function getSale(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid sale id' })
    }
    const sale = await Sale.findById(req.params.id).lean()
    if (!sale) return res.status(404).json({ ok: false, message: 'Sale not found' })

    const [items, warranties, settings, customer] = await Promise.all([
      SaleItem.find({ sale: sale._id }).sort({ boxCode: 1, imei: 1 }).lean(),
      Warranty.find({ sale: sale._id }).lean(),
      getSettings(),
      Customer.findById(sale.customer).select('email').lean(),
    ])
    const wOf = new Map(warranties.map((w) => [String(w.device), warrantyState(w)]))
    res.json({
      ok: true,
      sale,
      items: items.map((i) => ({ ...i, warranty: wOf.get(String(i.device)) || null })),
      settings,
      customerEmail: customer?.email || '',
      invoiceEmail: sale.invoiceEmail || null,
    })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/sales/:id
// For clearing test data (or an invoice made by mistake). In one transaction it puts the
// devices back to Available, removes the invoice, its items, warranties, any hand-overs
// made from it and payments that belonged only to it. A payment that was shared with other
// invoices blocks the delete, so other customers' ledgers are never silently changed.
export async function deleteSale(req, res, next) {
  const session = await mongoose.startSession()
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid sale id' })
    }
    const sale = await Sale.findById(req.params.id).lean()
    if (!sale) return res.status(404).json({ ok: false, message: 'Sale not found' })

    if (await ReturnCase.exists({ sale: sale._id })) {
      return res.status(400).json({ ok: false, message: 'This invoice has return cases and cannot be deleted' })
    }

    const payments = await Payment.find({ 'allocations.sale': sale._id }).lean()
    const shared = payments.find((p) => p.allocations.some((a) => String(a.sale) !== String(sale._id)))
    if (shared) {
      return res.status(400).json({
        ok: false,
        message: `Payment ${shared.reference} also covers other invoices. Void it first, then delete this invoice`,
      })
    }

    const adminName = req.admin?.name || req.admin?.username || req.admin?.email || ''
    await session.withTransaction(async () => {
      const items = await SaleItem.find({ sale: sale._id }).session(session).lean()
      const deviceIds = items.map((i) => i.device)

      await Device.updateMany(
        { _id: { $in: deviceIds } },
        { $set: { status: 'available', holder: null } },
        { session }
      )
      if (items.length) {
        await DeviceHistory.insertMany(
          items.map((i) => ({
            device: i.device,
            imei: i.imei,
            action: 'sale_deleted',
            fromStatus: 'sold',
            toStatus: 'available',
            note: `Invoice ${sale.invoiceNumber} deleted`,
            performedBy: req.admin?._id || null,
            performedByName: adminName,
          })),
          { session }
        )
      }
      await Transfer.deleteMany({ $or: [{ sale: sale._id }, { device: { $in: deviceIds } }] }, { session })
      await Warranty.deleteMany({ sale: sale._id }, { session })
      await SaleItem.deleteMany({ sale: sale._id }, { session })
      if (payments.length) {
        await Payment.deleteMany({ _id: { $in: payments.map((p) => p._id) } }, { session })
      }
      await Sale.deleteOne({ _id: sale._id }, { session })
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  } finally {
    session.endSession()
  }
}