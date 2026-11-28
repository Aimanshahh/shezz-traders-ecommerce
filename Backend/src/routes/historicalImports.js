import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import {
  previewHistoricalImport,
  commitHistoricalImport,
  listHistoricalImports,
  getHistoricalImport,
  rollbackHistoricalImport,
  listPendingCustomers,
  resolvePendingCustomer,
  rejectPendingCustomer,
} from '../controllers/historicalImportController.js'

const router = express.Router()

// Historical migration is an owner-level action: never exposed to salespeople.
router.use(protect, adminOnly)

router.post('/preview', previewHistoricalImport)
router.post('/commit', commitHistoricalImport)

router.get('/batches', listHistoricalImports)
router.get('/batches/:batch', getHistoricalImport)
router.post('/batches/:batch/rollback', rollbackHistoricalImport)

router.get('/pending', listPendingCustomers)
router.post('/pending/:id/resolve', resolvePendingCustomer)
router.post('/pending/:id/reject', rejectPendingCustomer)

export default router
