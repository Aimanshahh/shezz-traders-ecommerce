import mongoose from 'mongoose'

export const BOX_TYPES = ['carton', 'box']

// carton = master carton (about 100 devices) that holds boxes
// box    = inner box (about 10 devices) that holds devices
const boxSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    type: { type: String, enum: BOX_TYPES, required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Box', default: null, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    expectedCount: { type: Number, default: null, min: 0 },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
)

export default mongoose.model('Box', boxSchema)