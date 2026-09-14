import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'

function signToken(adminId) {
  return jwt.sign({ id: adminId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  })
}

// POST /api/admin/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, message: 'Email and password are required' })
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() })
    if (!admin) {
      return res
        .status(401)
        .json({ ok: false, message: 'Invalid email or password' })
    }

    const match = await admin.comparePassword(password)
    if (!match) {
      return res
        .status(401)
        .json({ ok: false, message: 'Invalid email or password' })
    }

    const token = signToken(admin._id)

    res.json({
      ok: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/me
export async function getMe(req, res) {
  res.json({
    ok: true,
    admin: {
      id: req.admin._id,
      email: req.admin.email,
      name: req.admin.name,
      role: req.admin.role,
    },
  })
}