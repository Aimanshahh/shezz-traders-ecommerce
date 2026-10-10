import mongoose from 'mongoose'
import Sale from '../models/Sale.js'
import SaleItem from '../models/SaleItem.js'
import Warranty from '../models/Warranty.js'
import Customer from '../models/Customer.js'
import { getSettings } from '../models/CrmSettings.js'
import { warrantyState } from '../utils/saleInfo.js'
import { sendCrmInvoiceEmail } from '../services/emailService.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function saveOrSendInvoiceEmail(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid invoice id' })
    }
    const recipient = String(req.body.email || '').trim().toLowerCase()
    if (!emailPattern.test(recipient)) {
      return res.status(400).json({ ok: false, message: 'Enter a valid email address' })
    }
    const action = req.body.action
    if (!['draft', 'send'].includes(action)) {
      return res.status(400).json({ ok: false, message: 'Choose save draft or send' })
    }

    const sale = await Sale.findById(req.params.id)
    if (!sale || sale.status !== 'completed') {
      return res.status(404).json({ ok: false, message: 'Completed invoice not found' })
    }

    const now = new Date()
    sale.invoiceEmail = sale.invoiceEmail || {}
    sale.invoiceEmail.recipient = recipient
    sale.invoiceEmail.status = 'draft'
    sale.invoiceEmail.savedAt = now
    if (action === 'draft') {
      await sale.save()
      await Customer.updateOne({ _id: sale.customer }, { $set: { email: recipient } })
      return res.json({ ok: true, invoiceEmail: sale.invoiceEmail })
    }

    await sale.save()
    await Customer.updateOne({ _id: sale.customer }, { $set: { email: recipient } })
    const [items, warranties, settings] = await Promise.all([
      SaleItem.find({ sale: sale._id }).sort({ boxCode: 1, imei: 1 }).lean(),
      Warranty.find({ sale: sale._id }).lean(),
      getSettings(),
    ])
    const warrantyByDevice = new Map(warranties.map((warranty) => [
      String(warranty.device),
      warrantyState(warranty),
    ]))
    const emailResult = await sendCrmInvoiceEmail({
      sale: sale.toObject(),
      items: items.map((item) => ({
        ...item,
        warranty: warrantyByDevice.get(String(item.device)) || null,
      })),
      settings,
      recipient,
    })
    if (!emailResult.ok) {
      return res.json({
        ok: true,
        status: 'draft',
        invoiceEmail: sale.invoiceEmail,
        delivery: { sent: false, message: `Draft saved, but email could not be sent: ${emailResult.reason}` },
      })
    }

    sale.invoiceEmail.status = 'sent'
    sale.invoiceEmail.sentAt = new Date()
    await sale.save()
    res.json({ ok: true, invoiceEmail: sale.invoiceEmail })
  } catch (err) {
    next(err)
  }
}
