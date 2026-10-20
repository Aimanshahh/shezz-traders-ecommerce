import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import {
  listDevices,
  getStats,
  getDevice,
  addDevice,
  previewImport,
  commitImport,
  scanDevice,
  updateStatus,
  deleteDevice,
} from '../controllers/Devicecontroller.js'

const router = express.Router()

// Stock maintenance (listing, scanning, adding, importing, status changes) is shared
// with salespeople so they can update stock from their own screens. Removing a
// device permanently stays an admin action.
router.use(protect)

router.get('/stats', getStats)
router.post('/scan', scanDevice)
router.post('/import/preview', previewImport)
router.post('/import', commitImport)

router.get('/', listDevices)
router.post('/', addDevice)
router.get('/:id', getDevice)
router.patch('/:id/status', updateStatus)
router.delete('/:id', adminOnly, deleteDevice)

export default router