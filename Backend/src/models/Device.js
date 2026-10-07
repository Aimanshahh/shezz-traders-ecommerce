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
    importBatch: { type: String, default: null },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
)

export default mongoose.model('Device', deviceSchema)