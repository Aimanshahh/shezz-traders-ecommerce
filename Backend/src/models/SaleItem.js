import mongoose from 'mongoose'

// One row per physical device on an invoice.
const saleItemSchema = new mongoose.Schema(
  {
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true, index: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true, index: true },
    imei: { type: String, required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    productName: { type: String, default: '' },
    box: { type: mongoose.Schema.Types.ObjectId, ref: 'Box', default: null },
    boxCode: { type: String, default: '' },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
)

export default mongoose.model('SaleItem', saleItemSchema)