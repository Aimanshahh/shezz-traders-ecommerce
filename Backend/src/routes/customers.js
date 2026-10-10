import express from 'express'
import { protect } from '../middleware/auth.js'
import {
  lookupCustomer,
  listCustomers,
  getCustomer,
  getLedger,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController.js'
import { recordPayment } from '../controllers/paymentController.js'

const router = express.Router()
router.use(protect)

router.get('/lookup', lookupCustomer)
router.get('/', listCustomers)
router.get('/:id', getCustomer)
router.get('/:id/ledger', getLedger)
router.post('/:id/payments', recordPayment)
router.patch('/:id', updateCustomer)
router.delete('/:id', deleteCustomer)

export default router