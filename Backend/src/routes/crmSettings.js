import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import { getCrmSettings, saveCrmSettings } from '../controllers/crmSettingsController.js'

const router = express.Router()
router.use(protect, adminOnly)
router.get('/', getCrmSettings)
router.put('/', saveCrmSettings)

export default router