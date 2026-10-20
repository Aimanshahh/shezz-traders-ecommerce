import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js'

const router = express.Router()
router.use(protect, adminOnly)

router.get('/', listUsers)
router.post('/', createUser)
router.patch('/:id', updateUser)
router.delete('/:id', deleteUser)

export default router
