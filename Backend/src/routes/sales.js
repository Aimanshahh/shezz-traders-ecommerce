import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import {
  resolveCode,
  completeSale,
  listSales,
  getSale,
  deleteSale,
} from '../controllers/salesController.js'
import { approveSale, rejectSale } from '../controllers/salesReviewController.js'
import { saveOrSendInvoiceEmail } from '../controllers/invoiceEmailController.js'

const router = express.Router()
router.use(protect, adminOnly)

router.post('/resolve', resolveCode)
router.get('/', listSales)
router.post('/', completeSale)
router.post('/:id/approve', approveSale)
router.post('/:id/reject', rejectSale)
router.post('/:id/email', saveOrSendInvoiceEmail)
router.get('/:id', getSale)
router.delete('/:id', deleteSale)

export default router
