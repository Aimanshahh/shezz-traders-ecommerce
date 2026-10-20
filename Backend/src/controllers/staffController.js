import mongoose from 'mongoose'
import Customer from '../models/Customer.js'
import CustomerPrice from '../models/CustomerPrice.js'
import Product from '../models/Product.js'
import Device from '../models/Device.js'
import DeviceHistory from '../models/DeviceHistory.js'
import Sale from '../models/Sale.js'
import SaleItem from '../models/SaleItem.js'
import Counter from '../models/Counter.js'
import Box from '../models/Box.js'
import { getSettings } from '../models/CrmSettings.js'
import { validateImei } from '../utils/Imei.js'
import { normalizeBoxCode } from '../utils/boxCode.js'

const MAX_ITEMS = 500
const round2 = (n) => Math.round(n * 100) / 100
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

class StaffError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

let collectionsReady = false
async function ensureCollections() {
  if (collectionsReady) return
  await Promise.all([Sale, SaleItem].map((m) => m.createCollection().catch(() => {})))
  collectionsReady = true
}

const publicCustomer = (c) => ({
  _id: c._id,
  name: c.name,
  phone: c.phone,
  city: c.city || '',
})

const itemView = (i) => ({
  _id: i._id,
  imei: i.imei,
  productName: i.productName || '',
  boxCode: i.boxCode || '',
  status: i.status || 'available',
})

// GET /api/staff/customers?q=
// Only what is needed to pick the buyer. No stats, balances or rates.
export async function listStaffCustomers(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100)
    const filter = {}
    if (req.query.q) {
      const rx = { $regex: escapeRegex(String(req.query.q).trim()), $options: 'i' }
      filter.$or = [{ name: rx }, { phone: rx }, { city: rx }]
    }
    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .select('name phone city')
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Customer.countDocuments(filter),
    ])
    res.json({
      ok: true,
      customers: customers.map(publicCustomer),
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/staff/products
// Device types only: id, name, price and how many units are available.
export async function listStaffProducts(req, res, next) {
  try {
    const [products, counts] = await Promise.all([
      // 👇 ADDED 'price' HERE
      Product.find({}).select('name category price').sort({ name: 1 }).lean(),
      Device.aggregate([
        { $match: { status: 'available', product: { $ne: null } } },
        { $group: { _id: '$product', available: { $sum: 1 } } },
      ]),
    ])
    const byId = new Map(counts.map((c) => [String(c._id), c.available]))
    res.json({
      ok: true,
      products: products.map((p) => ({
        _id: p._id,
        name: p.name,
        category: p.category || '',
        price: p.price || 0, // 👈 RETURN THE PRICE
        available: byId.get(String(p._id)) || 0,
      })),
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/staff/scan  { code }
// Looks up an IMEI, box or carton without ever returning money.
export async function resolveStaffScan(req, res, next) {
  try {
    const raw = String(req.body?.code ?? '').trim()
    if (!raw) return res.status(400).json({ ok: false, message: 'Nothing scanned' })

    let devices = []
    let kind = 'device'
    let label = raw

    if (/^\d+$/.test(raw)) {
      const r = validateImei(raw)
      if (!r.valid) {
        return res.json({ ok: true, kind: 'invalid', label: raw, message: r.reason })
      }
      const device = await Device.findOne({ imei: r.imei })
        .populate('product', 'name')
        .populate('box', 'code')
        .lean()
      if (!device) {
        return res.json({
          ok: true,
          kind: 'not_found',
          label: r.imei,
          imei: r.imei,
          message: 'This IMEI is not in inventory yet',
        })
      }
      devices = [device]
      label = device.imei
    } else {
      const box = await Box.findOne({ code: normalizeBoxCode(raw) }).select('_id code type').lean()
      if (!box) {
        return res.json({
          ok: true,
          kind: 'not_found',
          label: raw,
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
        .populate('product', 'name')
        .populate('box', 'code')
        .sort({ imei: 1 })
        .lean()
    }

    const items = devices.map((d) => ({
      imei: d.imei,
      status: d.status,
      available: d.status === 'available',
      product: d.product ? { _id: d.product._id, name: d.product.name } : null,
      box: d.box?.code || '',
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

// POST /api/staff/devices  { imei, productId }
// Registers a new unit into the existing inventory so it can be put on a sale.
export async function registerStaffDevice(req, res, next) {
  try {
    const r = validateImei(req.body?.imei)
    if (!r.valid) return res.status(400).json({ ok: false, message: r.reason })

    if (!mongoose.isValidObjectId(req.body?.productId)) {
      return res.status(400).json({ ok: false, message: 'Choose a device type first' })
    }
    const product = await Product.findById(req.body.productId).select('name').lean()
    if (!product) return res.status(400).json({ ok: false, message: 'Device type not found' })

    if (await Device.exists({ imei: r.imei })) {
      return res.status(409).json({ ok: false, message: 'This IMEI already exists in inventory' })
    }

    let device
    try {
      device = await Device.create({
        imei: r.imei,
        product: product._id,
        status: 'available',
        notes: 'Registered from a salesperson sale',
        createdBy: req.admin?._id || null,
      })
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ ok: false, message: 'This IMEI already exists in inventory' })
      }
      throw err
    }

    await DeviceHistory.create({
      device: device._id,
      imei: device.imei,
      action: 'added',
      toStatus: 'available',
      note: `Registered by ${req.admin.name || req.admin.email} while creating a sale`,
      performedBy: req.admin?._id || null,
      performedByName: req.admin.name || req.admin.email || '',
    })

    res.status(201).json({
      ok: true,
      device: { _id: device._id, imei: device.imei, product: { _id: product._id, name: product.name } },
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/staff/sales
// Body: { customerId, productId, items: [{ imei }], extras: [{ productId, quantity }], notes }
// The price of every device and extra comes from the server. A unitPrice sent
// by the browser is ignored, and a missing rate blocks the submission.
export async function createStaffSale(req, res, next) {
  const session = await mongoose.startSession()
  try {
    await ensureCollections()
    const body = req.body || {}

    if (!mongoose.isValidObjectId(body.customerId)) {
      return res.status(400).json({ ok: false, message: 'Choose a customer' })
    }
    if (!mongoose.isValidObjectId(body.productId)) {
      return res.status(400).json({ ok: false, message: 'Choose a device type' })
    }

    const [customer, product] = await Promise.all([
      Customer.findById(body.customerId).lean(),
      Product.findById(body.productId).select('name').lean(),
    ])
    if (!customer) return res.status(404).json({ ok: false, message: 'Customer not found' })
    if (!product) return res.status(400).json({ ok: false, message: 'Device type not found' })

    const rawItems = Array.isArray(body.items) ? body.items : []
    const rawExtras = Array.isArray(body.extras) ? body.extras : []

    if (rawItems.length === 0 && rawExtras.length === 0) {
      return res.status(400).json({ ok: false, message: 'Scan at least one device or add an extra component' })
    }
    if (rawItems.length > MAX_ITEMS) {
      return res.status(400).json({ ok: false, message: `Maximum ${MAX_ITEMS} devices per sale` })
    }

    const imeis = []
    const seen = new Set()
    for (const it of rawItems) {
      const r = validateImei(it?.imei)
      if (!r.valid) {
        return res.status(400).json({ ok: false, message: `${it?.imei ?? 'IMEI'}: ${r.reason}` })
      }
      if (seen.has(r.imei)) {
        return res.status(400).json({ ok: false, message: `${r.imei} is on this sale twice` })
      }
      seen.add(r.imei)
      imeis.push(r.imei)
    }

    // ── inventory validation (never trusts the scan result shown in the browser) ──
    const devices = imeis.length > 0 ? await Device.find({ imei: { $in: imeis } })
      .populate('product', 'name')
      .populate('box', 'code')
      .lean() : []
      
    const byImei = new Map(devices.map((d) => [d.imei, d]))

    const missing = imeis.filter((imei) => !byImei.has(imei))
    if (missing.length) {
      return res.status(409).json({
        ok: false,
        message: `${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ' and more' : ''} not in inventory. Register the device first.`,
      })
    }

    const unavailable = devices.filter((d) => d.status !== 'available')
    if (unavailable.length) {
      return res.status(409).json({
        ok: false,
        message: `${unavailable
          .slice(0, 3)
          .map((d) => `${d.imei} (${d.status})`)
          .join(', ')}${unavailable.length > 3 ? ' and more' : ''} cannot be sold`,
      })
    }

    const wrongProduct = devices.filter(
      (d) => !d.product || String(d.product._id) !== String(product._id)
    )
    if (wrongProduct.length) {
      const names = [...new Set(wrongProduct.map((d) => d.product?.name || 'unassigned'))]
      return res.status(400).json({
        ok: false,
        message: `${wrongProduct[0].imei} belongs to ${names[0]}, not ${product.name}. Scan the right device type.`,
      })
    }

    // Not reserved, but never on two waiting sales at once.
    const pendingSaleIds = await Sale.find({ status: 'pending' }).distinct('_id')
    if (pendingSaleIds.length && imeis.length > 0) {
      const clash = await SaleItem.findOne({
        sale: { $in: pendingSaleIds },
        imei: { $in: imeis },
      })
        .populate('sale', 'saleNumber invoiceNumber')
        .lean()
      if (clash) {
        return res.status(409).json({
          ok: false,
          message: `${clash.imei} is already waiting for review on ${clash.sale?.saleNumber || 'another sale'}`,
        })
      }
    }

    // ── the admin-configured rate, looked up per customer and product ──
    const rate = imeis.length > 0 ? await CustomerPrice.findOne({
      customer: customer._id,
      product: product._id,
    }).lean() : null;

    if (imeis.length > 0 && !rate) {
      return res.status(409).json({
        ok: false,
        message: `No rate is configured for ${product.name} for this customer. Ask the admin to set the customer rate before this sale can be submitted.`,
      })
    }

    const unitPrice = rate ? round2(Number(rate.price) || 0) : 0
    const devicesTotal = round2(unitPrice * imeis.length)

    // ── extras pricing (the backend applies the price automatically) ──
    const extras = []
    let extrasTotal = 0

    for (const raw of rawExtras) {
      if (!mongoose.isValidObjectId(raw?.productId)) {
        return res.status(400).json({ ok: false, message: 'Invalid extra product' })
      }
      const quantity = Number(raw.quantity)
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ ok: false, message: 'Extra product quantity is invalid' })
      }
      
      const prod = await Product.findById(raw.productId).lean()
      if (!prod) {
        return res.status(400).json({ ok: false, message: 'Extra product not found' })
      }
      if (prod.stock < quantity) {
        return res.status(400).json({ ok: false, message: `Not enough stock for extra product "${prod.name}"` })
      }

      const pUnitPrice = round2(Number(prod.price) || 0)
      const pTotal = round2(pUnitPrice * quantity)
      extrasTotal = round2(extrasTotal + pTotal)

      extras.push({
        product: prod._id,
        name: prod.name,
        quantity,
        unitPrice: pUnitPrice,
        total: pTotal,
      })
    }

    const subtotal = round2(devicesTotal + extrasTotal)
    const settings = await getSettings()
    const productName = product.name
    const boxCode = new Map(devices.map((d) => [d.imei, d.box?.code || '']))
    const salespersonName = req.admin.name || req.admin.email || ''

    let saleId = null
    let saleNumber = ''

    await session.withTransaction(async () => {
      // Deduct stock for extras
      for (const extra of extras) {
        const result = await Product.updateOne(
          { _id: extra.product, stock: { $gte: extra.quantity } },
          { $inc: { stock: -extra.quantity } },
          { session }
        )
        if (result.modifiedCount !== 1) throw new StaffError(`Extra product "${extra.name}" stock changed. Try again.`)
      }

      const counter = await Counter.findOneAndUpdate(
        { _id: 'staffSale' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
      )
      saleNumber = `SALE-${1000 + counter.seq}`

      const now = new Date()
      const [sale] = await Sale.create(
        [
          {
            // Provisional reference; the real invoice number is assigned on approval.
            invoiceNumber: saleNumber,
            saleNumber,
            customer: customer._id,
            customerSnapshot: {
              name: customer.name,
              phone: customer.phone,
              city: customer.city || '',
              address: customer.address || '',
            },
            source: 'offline',
            itemCount: imeis.length,
            extras: extras, // The backend attaches the calculated extras here
            subtotal,
            discount: 0,
            total: subtotal,
            amountPaid: 0,
            paymentStatus: 'unpaid',
            paymentMethod: 'cash',
            saleDate: now,
            soldBy: req.admin._id,
            soldByName: salespersonName,
            salesperson: req.admin._id,
            salespersonName,
            submittedAt: now,
            warrantyMonths: settings.warrantyMonths,
            notes: String(body.notes ?? '').slice(0, 1000),
            status: 'pending',
          },
        ],
        { session }
      )
      saleId = sale._id

      if (devices.length > 0) {
        await SaleItem.insertMany(
          devices.map((d) => ({
            sale: sale._id,
            device: d._id,
            imei: d.imei,
            product: d.product?._id || null,
            productName,
            box: d.box?._id || null,
            boxCode: boxCode.get(d.imei) || '',
            unitPrice,
            total: unitPrice,
          })),
          { session }
        )
      }
    })

    res.status(201).json({
      ok: true,
      sale: {
        _id: saleId,
        saleNumber,
        status: 'pending',
        itemCount: imeis.length,
        submittedAt: new Date(),
      },
    })
  } catch (err) {
    if (err instanceof StaffError) {
      return res.status(err.status).json({ ok: false, message: err.message })
    }
    next(err)
  } finally {
    session.endSession()
  }
}

// GET /api/staff/sales — only this salesperson's submissions, no money.
export async function listMySales(req, res, next) {
  try {
    const sales = await Sale.find({
      salesperson: req.admin._id,
      status: { $in: ['pending', 'completed', 'rejected', 'void'] },
    })
      .sort({ submittedAt: -1, createdAt: -1 })
      .limit(100)
      .lean()

    res.json({
      ok: true,
      sales: sales.map((s) => ({
        _id: s._id,
        saleNumber: s.saleNumber || s.invoiceNumber,
        invoiceNumber: s.status === 'completed' ? s.invoiceNumber : '',
        status: s.status,
        itemCount: s.itemCount,
        submittedAt: s.submittedAt || s.createdAt,
        customerName: s.customerSnapshot?.name || '',
        customerPhone: s.customerSnapshot?.phone || '',
        rejectionReason: s.status === 'rejected' ? s.rejectionReason || '' : '',
      })),
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/staff/sales/:id — the submitter can read the devices back.
export async function getMySale(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid sale id' })
    }
    const sale = await Sale.findOne({
      _id: req.params.id,
      salesperson: req.admin._id,
    }).lean()
    if (!sale) return res.status(404).json({ ok: false, message: 'Sale not found' })

    const items = await SaleItem.find({ sale: sale._id }).sort({ imei: 1 }).lean()

    res.json({
      ok: true,
      sale: {
        _id: sale._id,
        saleNumber: sale.saleNumber || sale.invoiceNumber,
        invoiceNumber: sale.status === 'completed' ? sale.invoiceNumber : '',
        status: sale.status,
        itemCount: sale.itemCount,
        submittedAt: sale.submittedAt || sale.createdAt,
        reviewedAt: sale.status === 'pending' ? null : sale.reviewedAt || null,
        rejectionReason: sale.status === 'rejected' ? sale.rejectionReason || '' : '',
        customer: {
          name: sale.customerSnapshot?.name || '',
          phone: sale.customerSnapshot?.phone || '',
          city: sale.customerSnapshot?.city || '',
        },
      },
      items: items.map(itemView),
    })
  } catch (err) {
    next(err)
  }
}