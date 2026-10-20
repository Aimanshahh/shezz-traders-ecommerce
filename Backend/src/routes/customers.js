import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import {
  lookupCustomer,
  listCustomers,
  getCustomer,
  getCustomerPrices,
  updateCustomerPrices,
  getLedger,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController.js'
import { recordPayment } from '../controllers/paymentController.js'

const router = express.Router()
router.use(protect, adminOnly)

router.get('/lookup', lookupCustomer)
router.get('/', listCustomers)
router.post('/', createCustomer)
router.get('/:id', getCustomer)
router.get('/:id/ledger', getLedger)
router.get('/:id/prices', getCustomerPrices)
router.put('/:id/prices', updateCustomerPrices)
router.post('/:id/payments', recordPayment)
router.patch('/:id', updateCustomer)
router.delete('/:id', deleteCustomer)

export default router
