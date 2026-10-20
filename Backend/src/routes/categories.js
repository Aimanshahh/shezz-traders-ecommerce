import express from 'express'
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js'
import { protect, adminOnly } from '../middleware/auth.js'

const router = express.Router()

router.get('/', getCategories)
router.get('/:id', getCategoryById)
router.post('/', protect, adminOnly, createCategory)
router.put('/:id', protect, adminOnly, updateCategory)
router.delete('/:id', protect, adminOnly, deleteCategory)

export default router