import express from 'express'
import { protect } from '../middleware/auth.js'
import { voidPayment } from '../controllers/paymentController.js'

const router = express.Router()
router.use(protect)
router.post('/:id/void', voidPayment)

export default router