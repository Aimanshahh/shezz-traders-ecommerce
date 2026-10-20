import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import {
  listBoxes,
  getBox,
  getBoxByCode,
  createBox,
  updateBox,
  deleteBox,
  addDevicesToBox,
  removeDeviceFromBox,
  addBoxesToCarton,
} from '../controllers/boxController.js'

const router = express.Router()

// Creating and filling boxes/cartons is stock work shared with salespeople.
// Deleting a box permanently stays an admin action.
router.use(protect)

router.get('/', listBoxes)
router.post('/', createBox)
router.get('/by-code/:code', getBoxByCode)

router.get('/:id', getBox)
router.patch('/:id', updateBox)
router.delete('/:id', adminOnly, deleteBox)

router.post('/:id/devices', addDevicesToBox)
router.delete('/:id/devices/:deviceId', removeDeviceFromBox)
router.post('/:id/boxes', addBoxesToCarton)

export default router