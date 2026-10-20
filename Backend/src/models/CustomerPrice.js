import mongoose from 'mongoose'

// The rate a specific customer pays for a specific product (device type).
// One row per customer + product, so adding a new device type never needs a schema change.
const customerPriceSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    price: { type: Number, required: true, min: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
)

customerPriceSchema.index({ customer: 1, product: 1 }, { unique: true })

export default mongoose.model('CustomerPrice', customerPriceSchema)
