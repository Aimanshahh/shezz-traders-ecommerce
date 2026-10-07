import express from 'express'
import { protect } from '../middleware/auth.js'
import {
  listDevices,
  getStats,
  getDevice,
  addDevice,
  previewImport,
  commitImport,
  scanDevice,
  updateStatus,
} from '../controllers/Devicecontroller.js'

const router = express.Router()

router.use(protect)

router.get('/stats', getStats)
router.post('/scan', scanDevice)
router.post('/import/preview', previewImport)
router.post('/import', commitImport)

router.get('/', listDevices)
router.post('/', addDevice)
router.get('/:id', getDevice)
router.patch('/:id/status', updateStatus)

export default router