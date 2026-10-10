import mongoose from 'mongoose'
import Customer from '../models/Customer.js'
import Sale from '../models/Sale.js'
import SaleItem from '../models/SaleItem.js'
import Warranty from '../models/Warranty.js'
import Device from '../models/Device.js'
import Payment from '../models/Payment.js'
import Transfer from '../models/Transfer.js'
import ReturnCase from '../models/ReturnCase.js'
import { normalizePhone, isValidPhone } from '../utils/phone.js'
import { warrantyState } from '../utils/saleInfo.js'
import { buildEntries, applyRange, outstandingOf } from '../utils/Ledger.js'

const round2 = (n) => Math.round(n * 100) / 100
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const emptyStats = { purchases: 0, devices: 0, spent: 0, paid: 0, balance: 0, lastPurchase: null }

// Map(customerId -> { purchases, devices, spent, paid, balance, lastPurchase })
async function statsFor(customerIds) {
  const map = new Map()
  if (!customerIds.length) return map
  const [saleRows, payRows] = await Promise.all([
    Sale.aggregate([
      { $match: { customer: { $in: customerIds }, status: 'completed' } },
      {
        $group: {
          _id: '$customer',
          purchases: { $sum: 1 },
          devices: { $sum: '$itemCount' },
          spent: { $sum: '$total' },
          paidAtSale: { $sum: '$amountPaid' },
          returned: { $sum: { $ifNull: ['$returnedAmount', 0] } },
          refunded: { $sum: { $ifNull: ['$refundedAmount', 0] } },
          lastPurchase: { $max: '$saleDate' },
        },
      },
    ]),
    Payment.aggregate([
      { $match: { customer: { $in: customerIds }, voided: false } },
      { $group: { _id: '$customer', paid: { $sum: '$amount' } } },
    ]),
  ])
  const payOf = new Map(payRows.map((r) => [String(r._id), r.paid]))
  saleRows.forEach((r) => {
    const spent = round2(r.spent - r.returned)
    const paid = round2(r.paidAtSale + (payOf.get(String(r._id)) || 0) - r.refunded)
    map.set(String(r._id), {
      purchases: r.purchases,
      devices: r.devices,
      spent,
      paid,
      balance: round2(spent - paid),
      lastPurchase: r.lastPurchase,
    })
  })
  // customers who only paid (no sales) still get a stats row
  payRows.forEach((r) => {
    const k = String(r._id)
    if (!map.has(k)) {
      map.set(k, { ...emptyStats, paid: round2(r.paid), balance: round2(-r.paid) })
    }
  })
  return map
}

// Groups transfer rows by the other customer.
function groupTransfers(rows, otherKey) {
  const groups = new Map()
  rows.forEach((t) => {
    const other = t[otherKey]
    if (!other) return
    const k = String(other._id)
    if (!groups.has(k)) {
      groups.set(k, {
        customer: { _id: other._id, name: other.name, phone: other.phone },
        count: 0,
        imeis: [],
        lastDate: t.date,
      })
    }
    const g = groups.get(k)
    g.count += 1
    g.imeis.push(t.imei)
    if (new Date(t.date) > new Date(g.lastDate)) g.lastDate = t.date
  })
  return [...groups.values()].sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate))
}

// GET /api/customers/lookup?phone=
export async function lookupCustomer(req, res, next) {
  try {
    const phone = normalizePhone(req.query.phone)
    if (!isValidPhone(phone)) return res.json({ ok: true, customer: null })
    const customer = await Customer.findOne({ phone }).lean()
    if (!customer) return res.json({ ok: true, customer: null })
    const stats = (await statsFor([customer._id])).get(String(customer._id)) || emptyStats
    res.json({ ok: true, customer, stats })
  } catch (err) {
    next(err)
  }
}

// GET /api/customers?q=&due=1&page=&limit=
export async function listCustomers(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100)
    const filter = {}
    if (req.query.q) {
      const q = String(req.query.q).trim()
      const rx = { $regex: escapeRegex(q), $options: 'i' }
      filter.$or = [{ name: rx }, { phone: rx }, { city: rx }]
    }
    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Customer.countDocuments(filter),
    ])
    const stats = await statsFor(customers.map((c) => c._id))
    res.json({
      ok: true,
      customers: customers.map((c) => ({ ...c, stats: stats.get(String(c._id)) || emptyStats })),
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/customers/:id
export async function getCustomer(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid customer id' })
    }
    const customer = await Customer.findById(req.params.id).lean()
    if (!customer) return res.status(404).json({ ok: false, message: 'Customer not found' })
    const myId = String(customer._id)

    const [sales, payments, outRows, inRows, returnCases] = await Promise.all([
      Sale.find({ customer: customer._id }).sort({ saleDate: -1, createdAt: -1 }).limit(200).lean(),
      Payment.find({ customer: customer._id }).sort({ date: -1, createdAt: -1 }).limit(200).lean(),
      Transfer.find({ from: customer._id }).populate('to', 'name phone').sort({ date: -1 }).lean(),
      Transfer.find({ to: customer._id }).populate('from', 'name phone').sort({ date: -1 }).lean(),
      ReturnCase.find({ customer: customer._id }).sort({ openedAt: -1 }).limit(100).lean(),
    ])
    const saleById = new Map(sales.map((s) => [String(s._id), s]))

    const items = await SaleItem.find({ sale: { $in: sales.map((s) => s._id) } }).lean()
    const deviceIds = [...new Set([...items.map((i) => String(i.device)), ...inRows.map((t) => String(t.device))])]
    const [devices, warranties] = await Promise.all([
      Device.find({ _id: { $in: deviceIds } }).select('imei status holder box').populate('holder', 'name').lean(),
      Warranty.find({ device: { $in: deviceIds } }).sort({ createdAt: 1 }).lean(),
    ])
    const devOf = new Map(devices.map((d) => [String(d._id), d]))
    const wOf = new Map()
    warranties.forEach((w) => wOf.set(String(w.device), w)) // latest wins

    const rows = []
    const seen = new Set()
    items.forEach((i) => {
      const d = devOf.get(String(i.device))
      const sale = saleById.get(String(i.sale))
      const key = `${i.device}-invoice`
      if (!d || seen.has(key)) return
      seen.add(key)
      rows.push({
        _id: d._id,
        imei: d.imei,
        productName: i.productName,
        boxCode: i.boxCode,
        status: d.status,
        source: 'invoice',
        invoiceNumber: sale?.invoiceNumber || '',
        saleId: i.sale,
        date: sale?.saleDate || null,
        warranty: warrantyState(wOf.get(String(d._id))),
        heldBy: d.holder && String(d.holder._id) !== myId ? d.holder.name : null,
      })
    })
    inRows.forEach((t) => {
      const d = devOf.get(String(t.device))
      const key = `${t.device}-handover-${t._id}`
      if (!d || seen.has(key)) return
      seen.add(key)
      rows.push({
        _id: d._id,
        imei: d.imei,
        productName: t.productName,
        boxCode: t.boxCode,
        status: d.status,
        source: 'handover',
        fromName: t.from?.name || '',
        date: t.date,
        warranty: warrantyState(wOf.get(String(d._id))),
        heldBy: d.holder && String(d.holder._id) !== myId ? d.holder.name : null,
      })
    })

    const stats = (await statsFor([customer._id])).get(myId) || emptyStats
    res.json({
      ok: true,
      customer,
      stats,
      sales: sales.map((s) => ({
        ...s,
        paid: round2(s.amountPaid + (s.paidLater || 0) - (s.refundedAmount || 0)),
        balance: outstandingOf(s),
      })),
      payments: payments.map((p) => ({
        ...p,
        appliedTo: (p.allocations || []).map((a) => saleById.get(String(a.sale))?.invoiceNumber).filter(Boolean),
      })),
      devices: rows,
      passedOn: groupTransfers(outRows, 'to'),
      receivedFrom: groupTransfers(inRows, 'from'),
      returnCases,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/customers/:id/ledger?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getLedger(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid customer id' })
    }
    const customer = await Customer.findById(req.params.id).lean()
    if (!customer) return res.status(404).json({ ok: false, message: 'Customer not found' })

    const from = req.query.from ? new Date(`${req.query.from}T00:00:00`) : null
    const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999`) : null
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      return res.status(400).json({ ok: false, message: 'Invalid date range' })
    }

    const [sales, payments, returnCases] = await Promise.all([
      Sale.find({ customer: customer._id, status: 'completed' }).lean(),
      Payment.find({ customer: customer._id }).lean(),
      ReturnCase.find({ customer: customer._id, status: 'resolved' }).lean(),
    ])
    const entries = buildEntries(sales, payments, returnCases)
    const result = applyRange(entries, from, to)

    // devices under each invoice that falls inside the range
    const inRange = sales
      .filter((s) => (!from || new Date(s.saleDate) >= from) && (!to || new Date(s.saleDate) <= to))
      .sort((a, b) => new Date(a.saleDate) - new Date(b.saleDate))
    const items = await SaleItem.find({ sale: { $in: inRange.map((s) => s._id) } })
      .sort({ boxCode: 1, imei: 1 })
      .lean()
    const bySale = new Map()
    items.forEach((i) => {
      const k = String(i.sale)
      if (!bySale.has(k)) bySale.set(k, [])
      bySale.get(k).push({ imei: i.imei, productName: i.productName, boxCode: i.boxCode, unitPrice: i.unitPrice })
    })

    res.json({
      ok: true,
      customer: { _id: customer._id, name: customer.name, phone: customer.phone, city: customer.city, address: customer.address },
      range: { from: req.query.from || '', to: req.query.to || '' },
      opening: result.opening,
      rows: result.rows,
      closing: result.closing,
      totalDebit: result.totalDebit,
      totalCredit: result.totalCredit,
      balanceDue: result.overall,
      invoices: inRange.map((s) => ({
        saleId: s._id,
        invoiceNumber: s.invoiceNumber,
        saleDate: s.saleDate,
        total: s.total,
        items: bySale.get(String(s._id)) || [],
      })),
    })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/customers/:id
export async function updateCustomer(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid customer id' })
    }
    const customer = await Customer.findById(req.params.id)
    if (!customer) return res.status(404).json({ ok: false, message: 'Customer not found' })

    const b = req.body
    if (b.name !== undefined) {
      const name = String(b.name).trim()
      if (!name) return res.status(400).json({ ok: false, message: 'Name cannot be empty' })
      customer.name = name
    }
    if (b.phone !== undefined) {
      const phone = normalizePhone(b.phone)
      if (!isValidPhone(phone)) return res.status(400).json({ ok: false, message: 'Invalid phone number' })
      const clash = await Customer.findOne({ phone, _id: { $ne: customer._id } }).select('_id').lean()
      if (clash) return res.status(409).json({ ok: false, message: 'Another customer already has this phone number' })
      customer.phone = phone
    }
    ;['city', 'address', 'email', 'notes'].forEach((f) => {
      if (b[f] !== undefined) customer[f] = String(b[f]).trim()
    })
    await customer.save()
    res.json({ ok: true, customer })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/customers/:id
// Only customers with no sales, payments or handovers (for example one created by a test).
export async function deleteCustomer(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid customer id' })
    }
    const customer = await Customer.findById(req.params.id)
    if (!customer) return res.status(404).json({ ok: false, message: 'Customer not found' })
    const [sales, payments, transfers, holding] = await Promise.all([
      Sale.exists({ customer: customer._id }),
      Payment.exists({ customer: customer._id }),
      Transfer.exists({ $or: [{ from: customer._id }, { to: customer._id }] }),
      Device.exists({ holder: customer._id }),
    ])
    if (sales || payments || transfers || holding) {
      return res.status(400).json({
        ok: false,
        message: 'This customer has invoices, payments or devices. Delete those first',
      })
    }
    await customer.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}