import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Device from '../models/Device.js'
import Sale from '../models/Sale.js'
import SaleItem from '../models/SaleItem.js'
import ReturnCase from '../models/ReturnCase.js'
import Warranty from '../models/Warranty.js'

function dateRange(query) {
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : null
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : null
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    const error = new Error('Invalid report date range')
    error.status = 400
    throw error
  }
  return { from, to }
}

function inRange(field, from, to) {
  const range = {}
  if (from) range.$gte = from
  if (to) range.$lte = to
  return Object.keys(range).length ? { [field]: range } : {}
}

export async function getAdminOverview(req, res, next) {
  try {
    const now = new Date()
    const warrantyLimit = new Date(now.getTime() + 30 * 86400000)
    const [orderCount, pendingOrders, productCount, lowStockProducts, lowStockCount, deviceRows, openCases, openCaseCount, expiringWarranties, expiringWarrantyCount, unpaidInvoices] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ['Pending', 'Awaiting Payment', 'Confirmed'] } }),
      Product.countDocuments(),
      Product.find({ stock: { $lte: 5 } }).select('name stock').sort({ stock: 1, name: 1 }).limit(6).lean(),
      Product.countDocuments({ stock: { $lte: 5 } }),
      Device.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ReturnCase.find({ status: 'open' }).select('caseNumber imei invoiceNumber holderName openedAt').sort({ openedAt: 1 }).limit(6).lean(),
      ReturnCase.countDocuments({ status: 'open' }),
      Warranty.find({ status: 'active', endDate: { $gte: now, $lte: warrantyLimit } })
        .populate('device', 'imei')
        .populate('customer', 'name')
        .sort({ endDate: 1 })
        .limit(6)
        .lean(),
      Warranty.countDocuments({ status: 'active', endDate: { $gte: now, $lte: warrantyLimit } }),
      Sale.countDocuments({ status: 'completed', paymentStatus: { $in: ['partial', 'unpaid'] } }),
    ])
    const deviceCounts = Object.fromEntries(deviceRows.map((row) => [row._id, row.count]))
    const alerts = [
      ...openCases.map((c) => ({
        id: c._id,
        type: 'return',
        severity: 'warning',
        title: `${c.caseNumber} needs resolution`,
        detail: `${c.imei} · ${c.holderName || 'Customer'} · invoice ${c.invoiceNumber}`,
        to: `/admin/returns/${c._id}`,
      })),
      ...expiringWarranties.map((w) => ({
        id: w._id,
        type: 'warranty',
        severity: 'info',
        title: `Warranty ending ${w.endDate.toISOString().slice(0, 10)}`,
        detail: `${w.device?.imei || 'Device'} · ${w.customer?.name || 'Customer'}`,
        to: w.device?._id ? `/admin/devices/${w.device._id}` : '/admin/devices',
      })),
      ...lowStockProducts.map((p) => ({
        id: p._id,
        type: 'stock',
        severity: p.stock === 0 ? 'error' : 'warning',
        title: p.stock === 0 ? `${p.name} is out of stock` : `${p.name} is running low`,
        detail: `${p.stock} in storefront stock`,
        to: '/admin/products',
      })),
    ]
    res.json({
      ok: true,
      overview: {
        orderCount,
        pendingOrders,
        productCount,
        lowStockCount,
        deviceCounts,
        openCaseCount,
        expiringWarrantyCount,
        unpaidInvoiceCount: unpaidInvoices,
        alerts,
      },
    })
  } catch (err) {
    next(err)
  }
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Money still owed on one invoice, mirroring outstandingOf() in utils/Ledger.js
// so the reports and the ledger cannot drift apart.
const OUTSTANDING_EXPR = {
  $subtract: [
    { $subtract: ['$total', { $ifNull: ['$returnedAmount', 0] }] },
    {
      $add: [
        {
          $subtract: [
            { $add: ['$amountPaid', { $ifNull: ['$paidLater', 0] }] },
            { $ifNull: ['$refundedAmount', 0] },
          ],
        },
        { $ifNull: ['$discountLater', 0] },
      ],
    },
  ],
}

const monthLabel = (key) => {
  const [year, month] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// GET /api/reports/monthly?months=12
// One row per calendar month: how many devices went out, what they were worth and
// what was actually collected. Devices are counted from completed CRM invoices;
// storefront orders are reported alongside but never mixed into device counts.
export async function getMonthlyReport(req, res, next) {
  try {
    const monthsBack = Math.min(Math.max(parseInt(req.query.months, 10) || 12, 1), 36)
    const now = new Date()
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1))
    const saleMatch = { status: 'completed', saleDate: { $gte: start, $lte: now } }

    const [saleRows, productRows, orderRows] = await Promise.all([
      Sale.aggregate([
        { $match: saleMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$saleDate' } },
            invoices: { $sum: 1 },
            devices: { $sum: '$itemCount' },
            gross: { $sum: '$total' },
            saleDiscounts: { $sum: { $ifNull: ['$discount', 0] } },
            laterDiscounts: { $sum: { $ifNull: ['$discountLater', 0] } },
            credits: { $sum: { $ifNull: ['$returnedAmount', 0] } },
            collected: {
              $sum: {
                $subtract: [
                  { $add: ['$amountPaid', { $ifNull: ['$paidLater', 0] }] },
                  { $ifNull: ['$refundedAmount', 0] },
                ],
              },
            },
            outstanding: { $sum: OUTSTANDING_EXPR },
          },
        },
      ]),
      SaleItem.aggregate([
        { $match: { createdAt: { $gte: start, $lte: now } } },
        { $lookup: { from: 'sales', localField: 'sale', foreignField: '_id', as: 'saleDoc' } },
        { $unwind: '$saleDoc' },
        { $match: { 'saleDoc.status': 'completed', 'saleDoc.saleDate': { $gte: start, $lte: now } } },
        {
          $project: {
            month: { $dateToString: { format: '%Y-%m', date: '$saleDoc.saleDate' } },
            name: { $ifNull: ['$productName', 'Device'] },
            // Allocate the invoice-level discount across its lines so product
            // revenue adds up to the invoice gross instead of overstating it.
            lineValue: {
              $cond: [
                { $gt: ['$saleDoc.subtotal', 0] },
                { $multiply: ['$total', { $divide: ['$saleDoc.total', '$saleDoc.subtotal'] }] },
                '$total',
              ],
            },
          },
        },
        {
          $group: {
            _id: { month: '$month', name: '$name' },
            devices: { $sum: 1 },
            revenue: { $sum: '$lineValue' },
          },
        },
        { $sort: { '_id.month': 1, devices: -1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: now } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            orders: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [{ $in: ['$status', ['Cancelled', 'Awaiting Payment']] }, 0, '$total'],
              },
            },
          },
        },
      ]),
    ])

    const productsByMonth = new Map()
    productRows.forEach((row) => {
      const key = row._id.month
      if (!productsByMonth.has(key)) productsByMonth.set(key, [])
      productsByMonth.get(key).push({
        name: row._id.name || 'Device',
        devices: row.devices,
        revenue: round2(row.revenue),
      })
    })
    const ordersByMonth = new Map(orderRows.map((row) => [row._id, row]))
    const salesByMonth = new Map(saleRows.map((row) => [row._id, row]))

    const months = []
    for (let i = 0; i < monthsBack; i += 1) {
      const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
      const key = cursor.toISOString().slice(0, 7)
      const sale = salesByMonth.get(key) || {}
      const order = ordersByMonth.get(key) || {}
      const invoices = sale.invoices || 0
      const devices = sale.devices || 0
      const gross = round2(sale.gross)
      const saleDiscounts = round2(sale.saleDiscounts)
      const laterDiscounts = round2(sale.laterDiscounts)
      const credits = round2(sale.credits)
      months.push({
        month: key,
        label: monthLabel(key),
        invoices,
        devices,
        gross,
        saleDiscounts,
        laterDiscounts,
        discounts: round2(saleDiscounts + laterDiscounts),
        credits,
        net: round2(gross - credits - laterDiscounts),
        collected: round2(sale.collected),
        outstanding: round2(sale.outstanding),
        avgInvoice: invoices ? round2(gross / invoices) : 0,
        avgDevices: invoices ? round2(devices / invoices) : 0,
        onlineOrders: order.orders || 0,
        onlineRevenue: round2(order.revenue),
        products: (productsByMonth.get(key) || []).slice(0, 12),
      })
    }

    const sumOf = (field) => round2(months.reduce((sum, m) => sum + m[field], 0))
    const totalDevices = sumOf('devices')
    const totalGross = sumOf('gross')
    const bestMonth = months.reduce(
      (best, m) => (m.devices > best.devices ? m : best),
      months[0] || { month: '', label: '—', devices: 0 }
    )

    res.json({
      ok: true,
      range: {
        from: start.toISOString().slice(0, 10),
        to: now.toISOString().slice(0, 10),
        months: monthsBack,
      },
      months,
      totals: {
        invoices: sumOf('invoices'),
        devices: totalDevices,
        gross: totalGross,
        saleDiscounts: sumOf('saleDiscounts'),
        laterDiscounts: sumOf('laterDiscounts'),
        discounts: sumOf('discounts'),
        credits: sumOf('credits'),
        net: sumOf('net'),
        collected: sumOf('collected'),
        outstanding: sumOf('outstanding'),
        onlineOrders: sumOf('onlineOrders'),
        onlineRevenue: sumOf('onlineRevenue'),
        avgDevicesPerMonth: round2(totalDevices / monthsBack),
        avgGrossPerMonth: round2(totalGross / monthsBack),
        avgInvoice: sumOf('invoices') ? round2(totalGross / sumOf('invoices')) : 0,
        bestMonth: { month: bestMonth.month, label: bestMonth.label, devices: bestMonth.devices },
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function getAdminReport(req, res, next) {
  try {
    const { from, to } = dateRange(req.query)
    const saleFilter = { status: 'completed', ...inRange('saleDate', from, to) }
    const orderFilter = { ...inRange('createdAt', from, to) }
    const returnFilter = { status: 'resolved', ...inRange('resolvedAt', from, to) }
    const [saleRows, orderRows, returnRows, dailyRows] = await Promise.all([
      Sale.aggregate([
        { $match: saleFilter },
        { $group: {
          _id: null,
          count: { $sum: 1 },
          devices: { $sum: '$itemCount' },
          gross: { $sum: '$total' },
          credits: { $sum: { $ifNull: ['$returnedAmount', 0] } },
          refunds: { $sum: { $ifNull: ['$refundedAmount', 0] } },
          saleDiscounts: { $sum: { $ifNull: ['$discount', 0] } },
          laterDiscounts: { $sum: { $ifNull: ['$discountLater', 0] } },
          collected: { $sum: { $subtract: [{ $add: ['$amountPaid', { $ifNull: ['$paidLater', 0] }] }, { $ifNull: ['$refundedAmount', 0] }] } },
        } },
      ]),
      Order.aggregate([
        { $match: orderFilter },
        { $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $in: ['$status', ['Cancelled', 'Awaiting Payment']] }, 0, '$total'] } },
          pending: { $sum: { $cond: [{ $in: ['$status', ['Pending', 'Awaiting Payment', 'Confirmed']] }, 1, 0] } },
        } },
      ]),
      ReturnCase.aggregate([
        { $match: returnFilter },
        { $group: {
          _id: null,
          count: { $sum: 1 },
          credits: { $sum: '$creditAmount' },
          refunds: { $sum: '$refundAmount' },
          replacements: { $sum: { $cond: [{ $eq: ['$resolution', 'replacement'] }, 1, 0] } },
        } },
      ]),
      Sale.aggregate([
        { $match: saleFilter },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
          count: { $sum: 1 },
          devices: { $sum: '$itemCount' },
          gross: { $sum: '$total' },
          credits: { $sum: { $ifNull: ['$returnedAmount', 0] } },
          saleDiscounts: { $sum: { $ifNull: ['$discount', 0] } },
          laterDiscounts: { $sum: { $ifNull: ['$discountLater', 0] } },
          collected: { $sum: { $subtract: [{ $add: ['$amountPaid', { $ifNull: ['$paidLater', 0] }] }, { $ifNull: ['$refundedAmount', 0] }] } },
        } },
        { $sort: { _id: 1 } },
      ]),
    ])
    const sales = saleRows[0] || { count: 0, devices: 0, gross: 0, credits: 0, refunds: 0, collected: 0, saleDiscounts: 0, laterDiscounts: 0 }
    const orders = orderRows[0] || { count: 0, revenue: 0, pending: 0 }
    const returns = returnRows[0] || { count: 0, credits: 0, refunds: 0, replacements: 0 }
    res.json({
      ok: true,
      range: { from: req.query.from || '', to: req.query.to || '' },
      summary: {
        sales: {
          count: sales.count,
          devices: sales.devices,
          gross: sales.gross,
          credits: sales.credits,
          saleDiscounts: sales.saleDiscounts,
          laterDiscounts: sales.laterDiscounts,
          discounts: sales.saleDiscounts + sales.laterDiscounts,
          net: sales.gross - sales.credits - sales.laterDiscounts,
          collected: sales.collected,
        },
        returns: { count: returns.count, credits: returns.credits, refunds: returns.refunds, replacements: returns.replacements },
        orders: { count: orders.count, revenue: orders.revenue, pending: orders.pending },
      },
      dailySales: dailyRows.map((row) => ({
        date: row._id,
        count: row.count,
        devices: row.devices,
        gross: row.gross,
        credits: row.credits,
        saleDiscounts: row.saleDiscounts,
        laterDiscounts: row.laterDiscounts,
        discounts: row.saleDiscounts + row.laterDiscounts,
        net: row.gross - row.credits - row.laterDiscounts,
        collected: row.collected,
      })),
    })
  } catch (err) {
    next(err)
  }
}
