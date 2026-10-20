import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import { sendOrderConfirmation } from '../services/emailService.js'

const router = express.Router()

// GET /api/test-email
router.get('/', protect, adminOnly, async (req, res) => {
  const testOrder = {
    orderNumber: 'SH-TEST-0001',
    customer: {
      name: 'Test Customer',
      phone: '0300-1234567',
      email: process.env.EMAIL_TO || process.env.SMTP_USER,
      address: '123 Test Street',
      city: 'Karachi',
      notes: 'This is a test email.',
    },
    items: [
      {
        name: 'Mini GPS Tracker',
        price: 8999,
        quantity: 2,
      },
    ],
    subtotal: 17998,
    shipping: 0,
    total: 17998,
    paymentMethod: 'cod',
    status: 'Pending',
  }

  const result = await sendOrderConfirmation(testOrder)
  res.json({ ok: true, result })
})

export default router