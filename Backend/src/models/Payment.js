import mongoose from 'mongoose'
import { PAYMENT_METHODS } from './Sale.js'

// Money received from a customer after a sale. It can be applied to specific invoices
// (allocations) and anything left over stays as credit on the account.
const paymentSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    date: { type: Date, default: Date.now, index: true },
    note: { type: String, default: '' },
    allocations: [
      {
        _id: false,
        sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    unallocated: { type: Number, default: 0, min: 0 },
    voided: { type: Boolean, default: false },
    voidedAt: { type: Date, default: null },
    voidedByName: { type: String, default: '' },
    voidReason: { type: String, default: '' },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    receivedByName: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.model('Payment', paymentSchema)