import SaleItem from '../models/SaleItem.js'
import Transfer from '../models/Transfer.js'

// Every step of a device's ownership: the Shezz Traders sale, then each handover.
export async function chainFor(deviceId) {
  const [items, transfers] = await Promise.all([
    SaleItem.find({ device: deviceId })
      .populate({ path: 'sale', select: 'invoiceNumber saleDate customer customerSnapshot' })
      .lean(),
    Transfer.find({ device: deviceId })
      .populate('from', 'name')
      .populate('to', 'name phone')
      .lean(),
  ])
  const events = []
  items.forEach((it) => {
    if (!it.sale) return
    events.push({
      type: 'sale',
      order: 1,
      date: it.sale.saleDate,
      saleId: it.sale._id,
      invoiceNumber: it.sale.invoiceNumber,
      customerId: it.sale.customer,
      customerName: it.sale.customerSnapshot?.name || '',
    })
  })
  transfers.forEach((t) => {
    events.push({
      type: 'transfer',
      order: 2,
      date: t.date,
      fromId: t.from?._id,
      fromName: t.from?.name || '',
      toId: t.to?._id,
      toName: t.to?.name || '',
      toPhone: t.to?.phone || '',
      note: t.note,
    })
  })
  events.sort((a, b) => new Date(a.date) - new Date(b.date) || a.order - b.order)
  return events
}