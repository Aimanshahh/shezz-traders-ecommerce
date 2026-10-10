import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Device from '../models/Device.js'
import Sale from '../models/Sale.js'
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
          collected: { $sum: { $subtract: [{ $add: ['$amountPaid', { $ifNull: ['$paidLater', 0] }] }, { $ifNull: ['$refundedAmount', 0] }] } },
        } },
        { $sort: { _id: 1 } },
      ]),
    ])
    const sales = saleRows[0] || { count: 0, devices: 0, gross: 0, credits: 0, refunds: 0, collected: 0 }
    const orders = orderRows[0] || { count: 0, revenue: 0, pending: 0 }
    const returns = returnRows[0] || { count: 0, credits: 0, refunds: 0, replacements: 0 }
    res.json({
      ok: true,
      range: { from: req.query.from || '', to: req.query.to || '' },
      summary: {
        sales: { count: sales.count, devices: sales.devices, gross: sales.gross, credits: sales.credits, net: sales.gross - sales.credits, collected: sales.collected },
        returns: { count: returns.count, credits: returns.credits, refunds: returns.refunds, replacements: returns.replacements },
        orders: { count: orders.count, revenue: orders.revenue, pending: orders.pending },
      },
      dailySales: dailyRows.map((row) => ({ date: row._id, count: row.count, devices: row.devices, gross: row.gross, credits: row.credits, net: row.gross - row.credits, collected: row.collected })),
    })
  } catch (err) {
    next(err)
  }
}
