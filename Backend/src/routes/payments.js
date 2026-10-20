import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import { voidPayment } from '../controllers/paymentController.js'

const router = express.Router()
router.use(protect, adminOnly)
router.post('/:id/void', voidPayment)

export default router