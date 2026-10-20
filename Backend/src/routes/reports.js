import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import { getAdminOverview, getAdminReport } from '../controllers/reportController.js'

const router = express.Router()
router.use(protect, adminOnly)
router.get('/overview', getAdminOverview)
router.get('/summary', getAdminReport)

export default router
