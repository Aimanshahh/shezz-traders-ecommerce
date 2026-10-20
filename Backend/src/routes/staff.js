import express from 'express'
import { protect, salespersonOnly } from '../middleware/auth.js'
import {
  listStaffCustomers,
  listStaffProducts,
  resolveStaffScan,
  registerStaffDevice,
  createStaffSale,
  listMySales,
  getMySale,
} from '../controllers/staffController.js'

const router = express.Router()
router.use(protect, salespersonOnly)

router.get('/customers', listStaffCustomers)
router.get('/products', listStaffProducts)
router.post('/scan', resolveStaffScan)
router.post('/devices', registerStaffDevice)
router.get('/sales', listMySales)
router.post('/sales', createStaffSale)
router.get('/sales/:id', getMySale)

export default router
