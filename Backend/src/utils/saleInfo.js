import SaleItem from '../models/SaleItem.js'
import Warranty from '../models/Warranty.js'

export function warrantyState(w, now = new Date()) {
  if (!w) return null
  if (w.status === 'void') {
    return { state: 'void', daysRemaining: 0, startDate: w.startDate, endDate: w.endDate }
  }
  const days = Math.ceil((new Date(w.endDate) - now) / 86400000)
  const state = days < 0 ? 'expired' : days <= 30 ? 'expiring_soon' : 'active'
  return {
    state,
    daysRemaining: Math.max(days, 0),
    startDate: w.startDate,
    endDate: w.endDate,
  }
}

// For each device id, the latest sale it was on plus its warranty.
// Returns Map(deviceId -> info).
export async function saleInfoFor(deviceIds) {
  const out = new Map()
  if (!deviceIds.length) return out

  const items = await SaleItem.find({ device: { $in: deviceIds } })
    .sort({ createdAt: -1 })
    // A pending or rejected submission is not a sale yet, so never label a device
    // with it. Only approved invoices (and voided ones) count as its sale.
    .populate({
      path: 'sale',
      match: { status: { $in: ['completed', 'void'] } },
      select: 'invoiceNumber saleDate customer customerSnapshot soldByName',
    })
    .lean()
  const warranties = await Warranty.find({ device: { $in: deviceIds } }).sort({ createdAt: -1 }).lean()

  const wOf = new Map()
  warranties.forEach((w) => {
    if (!wOf.has(String(w.device))) wOf.set(String(w.device), w)
  })

  items.forEach((it) => {
    const key = String(it.device)
    if (out.has(key) || !it.sale) return
    out.set(key, {
      saleId: it.sale._id,
      invoiceNumber: it.sale.invoiceNumber,
      saleDate: it.sale.saleDate,
      customerId: it.sale.customer,
      customerName: it.sale.customerSnapshot?.name || '',
      customerPhone: it.sale.customerSnapshot?.phone || '',
      soldByName: it.sale.soldByName || '',
      unitPrice: it.unitPrice,
      warranty: warrantyState(wOf.get(key)),
    })
  })
  return out
}