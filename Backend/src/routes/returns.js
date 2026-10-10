import express from 'express'
import { protect } from '../middleware/auth.js'
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

router.get('/lookup', lookupReturnDevice)
router.get('/', listReturnCases)
router.post('/', openReturnCase)
router.get('/:id', getReturnCase)
router.patch('/:id/resolve', resolveReturnCase)
router.post('/:id/cancel', cancelReturnCase)

export default router
