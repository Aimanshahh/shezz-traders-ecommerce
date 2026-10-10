import express from 'express'
import { protect } from '../middleware/auth.js'
import { resolveCode, completeSale, listSales, getSale, deleteSale } from '../controllers/salesController.js'
import { saveOrSendInvoiceEmail } from '../controllers/invoiceEmailController.js'

const router = express.Router()
router.use(protect)

router.post('/resolve', resolveCode)
router.get('/', listSales)
router.post('/', completeSale)
router.post('/:id/email', saveOrSendInvoiceEmail)
router.get('/:id', getSale)
router.delete('/:id', deleteSale)

export default router