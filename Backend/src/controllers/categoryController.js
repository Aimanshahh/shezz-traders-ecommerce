import Category from '../models/Category.js'
import Product from '../models/Product.js'

// GET /api/categories
export async function getCategories(req, res, next) {
  try {
    const categories = await Category.find().sort({ name: 1 })

    // Attach product counts
    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({
          category: cat.name,
        })
        return { ...cat.toObject(), productCount }
      })
    )

    res.json({ ok: true, count: withCounts.length, categories: withCounts })
  } catch (err) {
    next(err)
  }
}

// GET /api/categories/:id
export async function getCategoryById(req, res, next) {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res
        .status(404)
        .json({ ok: false, message: 'Category not found' })
    }
    res.json({ ok: true, category })
  } catch (err) {
    next(err)
  }
}

// POST /api/categories
export async function createCategory(req, res, next) {
  try {
    const category = await Category.create(req.body)
    res.status(201).json({ ok: true, category })
  } catch (err) {
    next(err)
  }
}

// PUT /api/categories/:id
export async function updateCategory(req, res, next) {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!category) {
      return res
        .status(404)
        .json({ ok: false, message: 'Category not found' })
    }
    res.json({ ok: true, category })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/categories/:id
export async function deleteCategory(req, res, next) {
  try {
    const category = await Category.findByIdAndDelete(req.params.id)
    if (!category) {
      return res
        .status(404)
        .json({ ok: false, message: 'Category not found' })
    }
    res.json({ ok: true, message: 'Category deleted' })
  } catch (err) {
    next(err)
  }
}