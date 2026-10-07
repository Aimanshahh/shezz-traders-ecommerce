import express from 'express'
import { protect } from '../middleware/auth.js'
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

router.use(protect)

router.get('/', listBoxes)
router.post('/', createBox)
router.get('/by-code/:code', getBoxByCode)

router.get('/:id', getBox)
router.patch('/:id', updateBox)
router.delete('/:id', deleteBox)

router.post('/:id/devices', addDevicesToBox)
router.delete('/:id/devices/:deviceId', removeDeviceFromBox)
router.post('/:id/boxes', addBoxesToCarton)

export default router