import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import {
  cancelReturnCase,
  getReturnCase,
  listReturnCases,
  lookupReturnDevice,
  openReturnCase,
  resolveReturnCase,
} from '../controllers/returnController.js'

const router = express.Router()
router.use(protect)

// Salespeople log warranty claims and returns at the counter, so intake and tracking
// are open to any signed-in account. Settling a case refunds money or reassigns stock,
// which stays with an administrator.
router.get('/lookup', lookupReturnDevice)
router.get('/', listReturnCases)
router.post('/', openReturnCase)
router.get('/:id', getReturnCase)
router.patch('/:id/resolve', adminOnly, resolveReturnCase)
router.post('/:id/cancel', adminOnly, cancelReturnCase)

export default router
