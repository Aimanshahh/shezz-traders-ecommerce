import mongoose from 'mongoose'

export const SALE_SOURCES = ['offline', 'whatsapp', 'phone', 'dealer', 'other']
export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'jazzcash', 'easypaisa', 'cheque', 'other']
export const PAYMENT_STATUSES = ['paid', 'partial', 'unpaid']

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    // Copied at sale time so an invoice never changes if the customer is edited later.
    customerSnapshot: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      city: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    source: { type: String, enum: SALE_SOURCES, default: 'offline' },
    itemCount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 }, // paid at the time of sale
    paidLater: { type: Number, default: 0, min: 0 }, // from payments recorded afterwards
    returnedAmount: { type: Number, default: 0, min: 0 },
    refundedAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'paid' },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    saleDate: { type: Date, default: Date.now, index: true },
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    soldByName: { type: String, default: '' },
    warrantyMonths: { type: Number, default: 6 },
    notes: { type: String, default: '' },
    invoiceEmail: {
      recipient: { type: String, default: '' },
      status: { type: String, enum: ['draft', 'sent', null], default: null },
      savedAt: { type: Date, default: null },
      sentAt: { type: Date, default: null },
    },
    status: { type: String, enum: ['completed', 'void'], default: 'completed' },
  },
  { timestamps: true }
)

export default mongoose.model('Sale', saleSchema)