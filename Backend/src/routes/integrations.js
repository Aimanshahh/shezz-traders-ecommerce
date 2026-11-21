import express from 'express'
import { requireIntegrationKey } from '../middleware/integrationKey.js'
import { listHandovers } from '../controllers/integrationController.js'

const router = express.Router()
router.use(requireIntegrationKey)
router.get('/handovers', listHandovers)

export default router
