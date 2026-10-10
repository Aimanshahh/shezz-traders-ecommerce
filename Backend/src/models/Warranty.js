import mongoose from 'mongoose'

// Created automatically for every device sold. "expired" / "expiring soon" are worked out
// from endDate when read, so nothing has to be updated each day.
const warrantySchema = new mongoose.Schema(
  {
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true, index: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true, index: true },
    months: { type: Number, required: true },
    status: { type: String, enum: ['active', 'void'], default: 'active' },
    policy: { type: String, default: 'standard' },
  },
  { timestamps: true }
)

export default mongoose.model('Warranty', warrantySchema)