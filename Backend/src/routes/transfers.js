import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import { resolveForTransfer, createTransfer } from '../controllers/transferController'

const router = express.Router()
router.use(protect, adminOnly)
router.post('/resolve', resolveForTransfer)
router.post('/', createTransfer)

export default router