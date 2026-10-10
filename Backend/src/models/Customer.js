import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    city: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
)

export default mongoose.model('Customer', customerSchema)