import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { sendOrderConfirmation } from '../services/emailService.js'

// ══════════════════════════════════════════════════════
//  CREATE ORDER  (public)
// ══════════════════════════════════════════════════════


export async function createOrder(req, res, next) {
  try {
    const { customer, items, paymentMethod, notes } = req.body

    // ── Validate customer
    if (!customer || !customer.name || !customer.phone || !customer.address || !customer.city) {
      return res.status(400).json({
        ok: false,
        message: 'Customer name, phone, address, and city are required.',
      })
    }

    // ── Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'Order must have at least one item.',
      })
    }

    // ── Validate payment method
    const validMethods = ['cod', 'jazzcash', 'easypaisa', 'bank']
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid payment method.',
      })
    }

    // ── Load real products from DB (never trust client prices)
    const productIds = items.map((i) => i.productId)
    const products = await Product.find({ _id: { $in: productIds } })

    if (products.length !== productIds.length) {
      return res.status(400).json({
        ok: false,
        message: 'One or more products no longer exist.',
      })
    }

    // ── Build order items with real prices + validate stock
    const orderItems = []
    let subtotal = 0

    for (const item of items) {
      const product = products.find(
        (p) => p._id.toString() === item.productId
      )
      if (!product) {
        return res.status(400).json({
          ok: false,
          message: `Product not found: ${item.productId}`,
        })
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          ok: false,
          message: `Not enough stock for "${product.name}". Available: ${product.stock}`,
        })
      }

      const lineTotal = product.price * item.quantity
      subtotal += lineTotal

      orderItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: (Array.isArray(product.images) && product.images[0]) || product.image || '',
      })
    }

    const shipping = 0 // free shipping
    const total = subtotal + shipping

    // ── Determine initial status
    const status =
      paymentMethod === 'cod' ? 'Pending' : 'Awaiting Payment'

    // ── Create order
    const order = await Order.create({
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        email: (customer.email || '').trim(),
        address: customer.address.trim(),
        city: customer.city.trim(),
        notes: (notes || '').trim(),
      },
      items: orderItems,
      subtotal,
      shipping,
      total,
      paymentMethod,
      status,
      paymentStatus: 'unpaid',
    })

    // ── Decrement stock
    await Promise.all(
      orderItems.map((item) =>
        Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity },
        })
      )
    )

        // ── Send confirmation emails (non-blocking) ──
    sendOrderConfirmation(order).catch((err) =>
      console.error('Email error:', err.message)
    )

    res.status(201).json({ ok: true, order })
  } catch (err) {
    next(err)
  }
}

// ══════════════════════════════════════════════════════
//  GET ALL ORDERS  (admin)
// ══════════════════════════════════════════════════════
export async function getOrders(req, res, next) {
  try {
    const { status, search, limit } = req.query

    const filter = {}
    if (status && status !== 'All') filter.status = status
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
      ]
    }

    let query = Order.find(filter).sort({ createdAt: -1 })
    if (limit) query = query.limit(Number(limit))

    const orders = await query
    res.json({ ok: true, count: orders.length, orders })
  } catch (err) {
    next(err)
  }
}

// ══════════════════════════════════════════════════════
//  LOOKUP BY PHONE  (public — customer looks up own order)
// ══════════════════════════════════════════════════════
export async function lookupOrder(req, res, next) {
  try {
    const { phone, orderNumber } = req.query

    if (!phone && !orderNumber) {
      return res.status(400).json({
        ok: false,
        message: 'Provide phone or order number.',
      })
    }

    const filter = {}
    if (phone) filter['customer.phone'] = phone.trim()
    if (orderNumber) filter.orderNumber = orderNumber.trim().toUpperCase()

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(20)
    res.json({ ok: true, count: orders.length, orders })
  } catch (err) {
    next(err)
  }
}

// ══════════════════════════════════════════════════════
//  UPDATE ORDER STATUS  (admin)
// ══════════════════════════════════════════════════════
export async function updateOrderStatus(req, res, next) {
  try {
    const { status, paymentStatus, trackingNumber } = req.body

    const update = {}
    if (status) update.status = status
    if (paymentStatus) update.paymentStatus = paymentStatus
    if (trackingNumber !== undefined) update.trackingNumber = trackingNumber

    const order = await Order.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    })

    if (!order) {
      return res.status(404).json({ ok: false, message: 'Order not found' })
    }

    res.json({ ok: true, order })
  } catch (err) {
    next(err)
  }
}

// ══════════════════════════════════════════════════════
//  DELETE ORDER  (admin) — restores stock
// ══════════════════════════════════════════════════════
export async function deleteOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ ok: false, message: 'Order not found' })
    }

    // Restore stock if order wasn't cancelled (cancelled already restored)
    if (order.status !== 'Cancelled') {
      await Promise.all(
        order.items.map((item) =>
          Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity },
          })
        )
      )
    }

    await order.deleteOne()
    res.json({ ok: true, message: 'Order deleted and stock restored' })
  } catch (err) {
    next(err)
  }
}

// ══════════════════════════════════════════════════════
//  DASHBOARD STATS  (admin)
// ══════════════════════════════════════════════════════
export async function getDashboardStats(req, res, next) {
  try {
    const [allOrders, productCount] = await Promise.all([
      Order.find().sort({ createdAt: -1 }),
      Product.countDocuments(),
    ])

    const paidOrders = allOrders.filter(
      (o) => o.status !== 'Cancelled' && o.status !== 'Awaiting Payment'
    )
    const revenue = paidOrders.reduce((sum, o) => sum + o.total, 0)

    const recentOrders = allOrders.slice(0, 5)

    res.json({
      ok: true,
      stats: {
        revenue,
        orderCount: allOrders.length,
        productCount,
        recentOrders,
      },
    })
  } catch (err) {
    next(err)
  }
}