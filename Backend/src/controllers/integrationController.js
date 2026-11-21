import Customer from '../models/Customer.js'
import Transfer from '../models/Transfer.js'
import '../models/Sale.js'

const MAX_LIMIT = 2000

async function findDealer() {
  // The dealer devices are sold to. Set INTEGRATION_DEALER_CUSTOMER_ID to be exact;
  // otherwise the customer named "Track Master" / "TrackMaster" is used.
  const id = process.env.INTEGRATION_DEALER_CUSTOMER_ID
  if (id) return Customer.findById(id).select('name')
  return Customer.findOne({ name: /^\s*track\s*master\s*$/i }).select('name')
}

// GET /api/integrations/handovers?since=ISO_DATE&limit=500
// Devices the dealer handed on to someone else (the technicians), newest last.
// Read-only and money-free: IMEI, recipient, date, product, box and invoice only.
export async function listHandovers(req, res, next) {
  try {
    const dealer = await findDealer()
    if (!dealer) {
      return res.status(404).json({ ok: false, message: 'The dealer customer was not found' })
    }

    const filter = { from: dealer._id }
    if (req.query.since) {
      const since = new Date(String(req.query.since))
      if (Number.isNaN(since.getTime())) {
        return res.status(400).json({ ok: false, message: 'since must be a valid date' })
      }
      filter.date = { $gt: since }
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 1), MAX_LIMIT)

    const rows = await Transfer.find(filter)
      .sort({ date: 1, _id: 1 })
      .limit(limit)
      .populate('to', 'name phone')
      .populate('sale', 'invoiceNumber')
      .lean()

    const data = rows.map((row) => ({
      transferId: String(row._id),
      imei: row.imei,
      date: row.date,
      productName: row.productName || '',
      boxCode: row.boxCode || '',
      invoiceNumber: row.sale?.invoiceNumber || '',
      recipient: row.to ? { id: String(row.to._id), name: row.to.name, phone: row.to.phone || '' } : null,
    }))

    res.json({
      ok: true,
      dealer: { id: String(dealer._id), name: dealer.name },
      count: data.length,
      hasMore: rows.length === limit,
      data,
    })
  } catch (error) {
    next(error)
  }
}
