import mongoose from 'mongoose'

export const PENDING_CUSTOMER_STATUSES = ['pending', 'resolved', 'rejected']

// A sold historical device whose customer name does not match any existing customer.
// The device is imported (status sold, holder empty) but stays out of the customer's
// record, and out of available stock, until Operations/Admin resolves this entry.
const pendingCustomerSchema = new mongoose.Schema(
  {
    batch: { type: String, required: true, index: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true, index: true },
    imei: { type: String, required: true, index: true },
    // Exactly as written in the sheet, so nothing is lost while waiting for details.
    rawCustomerName: { type: String, required: true, trim: true },
    saleDate: { type: Date, default: null },
    productName: { type: String, default: '' },
    receivedMonth: { type: String, default: null },
    suggestedCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    suggestionNote: { type: String, default: '' },
    status: { type: String, enum: PENDING_CUSTOMER_STATUSES, default: 'pending', index: true },
    resolvedCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    resolvedSale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    resolvedByName: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.model('PendingCustomer', pendingCustomerSchema)
