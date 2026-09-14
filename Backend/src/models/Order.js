import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: '' },
  },
  { _id: false }
)

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, default: '', trim: true },
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      notes: { type: String, default: '' },
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: 'Order must have at least one item',
      },
    },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['cod', 'jazzcash', 'easypaisa', 'bank'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paymentReference: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'Awaiting Payment',
        'Confirmed',
        'Shipped',
        'Delivered',
        'Cancelled',
      ],
      default: 'Pending',
    },
    trackingNumber: { type: String, default: '' },
  },
  { timestamps: true }
)

// Robust order number generation
orderSchema.pre('validate', function (next) {
  if (!this.orderNumber) {
    const ts = Date.now().toString().slice(-8)
    const rand = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, '0')
    this.orderNumber = `SH-${ts}${rand}`
  }
  next()
})

export default mongoose.model('Order', orderSchema)