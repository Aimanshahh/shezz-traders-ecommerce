import mongoose from 'mongoose'
import Sale, { PAYMENT_METHODS } from '../models/Sale.js'
import Payment from '../models/Payment.js'
import Customer from '../models/Customer.js'
import Counter from '../models/Counter.js'
import { allocateFifo, outstandingOf } from '../utils/Ledger.js'

const round2 = (n) => Math.round(n * 100) / 100

class PayError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

const adminName = (req) => req.admin?.name || req.admin?.username || req.admin?.email || ''

// Re-adds up the payments applied to an invoice and refreshes its paid status.
async function recomputeSale(saleId, session) {
  const sale = await Sale.findById(saleId).session(session)
  if (!sale) return
  const rows = await Payment.aggregate([
    { $match: { voided: false, 'allocations.sale': sale._id } },
    { $unwind: '$allocations' },
    { $match: { 'allocations.sale': sale._id } },
    { $group: { _id: null, sum: { $sum: '$allocations.amount' } } },
  ]).session(session)
  sale.paidLater = round2(rows[0]?.sum || 0)
  const paid = sale.amountPaid + sale.paidLater
  sale.paymentStatus = outstandingOf(sale) <= 0.001 ? 'paid' : paid <= 0 ? 'unpaid' : 'partial'
  await sale.save({ session })
}

let collectionsReady = false
async function ensureCollections() {
  if (collectionsReady) return
  await Promise.all([Payment, Counter].map((m) => m.createCollection().catch(() => {})))
  collectionsReady = true
}

// POST /api/customers/:id/payments
// { amount, method?, date?, note?, saleId? }  Without saleId it is applied to the oldest
// unpaid invoices first; anything left over stays as credit on the account.
export async function recordPayment(req, res, next) {
  const session = await mongoose.startSession()
  try {
    await ensureCollections()
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid customer id' })
    }
    const amount = round2(Number(req.body.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, message: 'Enter an amount greater than zero' })
    }
    const method = req.body.method || 'cash'
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ ok: false, message: 'Invalid payment method' })
    }
    let date = new Date()
    if (req.body.date) {
      date = new Date(req.body.date)
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ ok: false, message: 'Invalid date' })
      }
    }
    const saleId = req.body.saleId || null
    if (saleId && !mongoose.isValidObjectId(saleId)) {
      return res.status(400).json({ ok: false, message: 'Invalid invoice' })
    }

    let created = null
    await session.withTransaction(async () => {
      const customer = await Customer.findById(req.params.id).session(session)
      if (!customer) throw new PayError('Customer not found', 404)

      let allocations = []
      let unallocated = 0
      if (saleId) {
        const sale = await Sale.findOne({ _id: saleId, customer: customer._id, status: 'completed' }).session(session)
        if (!sale) throw new PayError('Invoice not found for this customer', 404)
        const out = outstandingOf(sale)
        if (amount > out + 0.001) {
          throw new PayError(`That is more than the ${sale.invoiceNumber} balance of ${out}`)
        }
        allocations = [{ sale: sale._id, amount }]
      } else {
        const open = await Sale.find({ customer: customer._id, status: 'completed', paymentStatus: { $ne: 'paid' } })
          .sort({ saleDate: 1, createdAt: 1 })
          .session(session)
          .lean()
        const result = allocateFifo(amount, open)
        allocations = result.allocations
        unallocated = result.unallocated
      }

      const counter = await Counter.findOneAndUpdate(
        { _id: 'payment' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
      )
      ;[created] = await Payment.create(
        [
          {
            reference: `PMT-${1000 + counter.seq}`,
            customer: customer._id,
            amount,
            method,
            date,
            note: String(req.body.note ?? '').slice(0, 500),
            allocations,
            unallocated,
            receivedBy: req.admin?._id || null,
            receivedByName: adminName(req),
          },
        ],
        { session }
      )
      for (const a of allocations) await recomputeSale(a.sale, session)
    })

    res.status(201).json({ ok: true, payment: created })
  } catch (err) {
    if (err instanceof PayError) return res.status(err.status).json({ ok: false, message: err.message })
    next(err)
  } finally {
    session.endSession()
  }
}

// POST /api/payments/:id/void  { reason? }
export async function voidPayment(req, res, next) {
  const session = await mongoose.startSession()
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid payment id' })
    }
    await session.withTransaction(async () => {
      const payment = await Payment.findById(req.params.id).session(session)
      if (!payment) throw new PayError('Payment not found', 404)
      if (payment.voided) throw new PayError('This payment is already voided')
      payment.voided = true
      payment.voidedAt = new Date()
      payment.voidedByName = adminName(req)
      payment.voidReason = String(req.body.reason ?? '').slice(0, 300)
      await payment.save({ session })
      for (const a of payment.allocations) await recomputeSale(a.sale, session)
    })
    res.json({ ok: true })
  } catch (err) {
    if (err instanceof PayError) return res.status(err.status).json({ ok: false, message: err.message })
    next(err)
  } finally {
    session.endSession()
  }
}