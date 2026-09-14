import express from 'express'
import {
  createOrder,
  getOrders,
  lookupOrder,
  updateOrderStatus,
  deleteOrder,
  getDashboardStats,
} from '../controllers/orderController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// Public
router.post('/', createOrder)              // place an order
router.get('/lookup', lookupOrder)         // customer lookup by phone

// Admin only
router.get('/', protect, getOrders)                          // list
router.get('/stats/dashboard', protect, getDashboardStats)   // dashboard numbers
router.patch('/:id/status', protect, updateOrderStatus)      // change status
router.delete('/:id', protect, deleteOrder)                  // delete + restore stock

export default router