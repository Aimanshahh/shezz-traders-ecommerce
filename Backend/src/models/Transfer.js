import mongoose from 'mongoose'

// One row each time a dealer passes a device on to someone else.
const transferSchema = new mongoose.Schema(
  {
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true, index: true },
    imei: { type: String, required: true, index: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
    productName: { type: String, default: '' },
    boxCode: { type: String, default: '' },
    date: { type: Date, default: Date.now, index: true },
    note: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    createdByName: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.model('Transfer', transferSchema)