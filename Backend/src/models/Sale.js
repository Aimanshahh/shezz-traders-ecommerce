import mongoose from 'mongoose'

export const SALE_SOURCES = ['offline', 'whatsapp', 'phone', 'dealer', 'other']
export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'jazzcash', 'easypaisa', 'cheque', 'other']
export const PAYMENT_STATUSES = ['paid', 'partial', 'unpaid']

// pending  → submitted by a salesperson, waiting for the admin to review it.
// completed→ reviewed (or an admin's own sale) and now a real invoice.
// rejected → reviewed and refused; the devices were never taken out of inventory.
export const SALE_STATUSES = ['completed', 'void', 'pending', 'rejected']

const saleSchema = new mongoose.Schema(
  {
    // For a completed sale this is the invoice number. A pending sale gets a
    // provisional SALE-xxxx reference that is replaced when the admin approves it.
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    // Permanent reference that never changes, so a submission can always be traced.
    saleNumber: { type: String, default: '', index: true },
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
    extras: [{
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      unitPrice: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
    }],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 }, // paid at the time of sale
    paidLater: { type: Number, default: 0, min: 0 }, // from payments recorded afterwards
    returnedAmount: { type: Number, default: 0, min: 0 },
    refundedAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'paid' },
    dueDate: { type: Date, default: null, index: true }, // when a pending payment is expected
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    saleDate: { type: Date, default: Date.now, index: true },
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    soldByName: { type: String, default: '' },
    // Salesperson submission trail. Kept even after approval so the admin can audit it.
    salesperson: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null, index: true },
    salespersonName: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewedByName: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    reviewNotes: { type: String, default: '' },
    warrantyMonths: { type: Number, default: 6 },
    notes: { type: String, default: '' },
    invoiceEmail: {
      recipient: { type: String, default: '' },
      status: { type: String, enum: ['draft', 'sent', null], default: null },
      savedAt: { type: Date, default: null },
      sentAt: { type: Date, default: null },
    },
    status: { type: String, enum: SALE_STATUSES, default: 'completed', index: true },
  },
  { timestamps: true }
)

export default mongoose.model('Sale', saleSchema)
