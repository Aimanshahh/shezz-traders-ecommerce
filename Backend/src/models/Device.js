import mongoose from 'mongoose'

export const DEVICE_STATUSES = [
  'available',
  'reserved',
  'sold',
  'returned',
  'replacement',
  'faulty',
  'lost',
  'deactivated',
]

const deviceSchema = new mongoose.Schema(
  {
    imei: { type: String, required: true, unique: true, trim: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    status: { type: String, enum: DEVICE_STATUSES, default: 'available', index: true },
    // The box this device came in. Stays set after a sale so the origin is never lost.
    box: { type: mongoose.Schema.Types.ObjectId, ref: 'Box', default: null, index: true },
    // Who holds the device now. Set when it is sold and changed by every handover.
    holder: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    replaces: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null },
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null },
    importBatch: { type: String, default: null },
    // ── Historical import only. Null/empty on every device created by normal use. ──
    // The month the stock arrived, exactly as the old sheet records it ('YYYY-MM').
    receivedMonth: { type: String, default: null, index: true },
    recordSource: { type: String, enum: ['live', 'historical_import'], default: 'live', index: true },
    // Sold, but the customer is still waiting for Operations/Admin to supply details.
    customerPending: { type: Boolean, default: false, index: true },
    // Original sale date from the sheet, kept even when no invoice could be created yet.
    saleDateHint: { type: Date, default: null },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
)

export default mongoose.model('Device', deviceSchema)