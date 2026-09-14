import Product from '../models/Product.js'

// GET /api/products
// Public — list all products with optional filters
export async function getProducts(req, res, next) {
  try {
    const { category, search, featured, limit, sort } = req.query

    const filter = {}
    if (category) filter.category = category
    if (featured === 'true') filter.isFeatured = true
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    let query = Product.find(filter)

    if (sort === 'price-asc') query = query.sort({ price: 1 })
    else if (sort === 'price-desc') query = query.sort({ price: -1 })
    else if (sort === 'rating') query = query.sort({ rating: -1 })
    else query = query.sort({ createdAt: -1 })

    if (limit) query = query.limit(Number(limit))

    const products = await query
    res.json({ ok: true, count: products.length, products })
  } catch (err) {
    next(err)
  }
}

// GET /api/products/:id
export async function getProductById(req, res, next) {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res
        .status(404)
        .json({ ok: false, message: 'Product not found' })
    }
    res.json({ ok: true, product })
  } catch (err) {
    next(err)
  }
}

// POST /api/products
// 🔒 Admin only (auth added in Phase 2)
export async function createProduct(req, res, next) {
  try {
    const product = await Product.create(req.body)
    res.status(201).json({ ok: true, product })
  } catch (err) {
    next(err)
  }
}

// PUT /api/products/:id
export async function updateProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!product) {
      return res
        .status(404)
        .json({ ok: false, message: 'Product not found' })
    }
    res.json({ ok: true, product })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/products/:id
export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) {
      return res
        .status(404)
        .json({ ok: false, message: 'Product not found' })
    }
    res.json({ ok: true, message: 'Product deleted' })
  } catch (err) {
    next(err)
  }
}