import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'

function signToken(admin) {
  return jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  })
}

const publicUser = (admin) => ({
  id: admin._id,
  email: admin.email,
  name: admin.name,
  role: admin.role,
})

// POST /api/admin/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, message: 'Email and password are required' })
    }

    const admin = await Admin.findOne({
      email: String(email).toLowerCase().trim(),
    })
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

    if (admin.isActive === false) {
      return res.status(403).json({
        ok: false,
        message: 'This account has been deactivated. Contact the admin.',
      })
    }

    admin.lastLoginAt = new Date()
    await admin.save()

    const token = signToken(admin)

    res.json({
      ok: true,
      token,
      admin: publicUser(admin),
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/me
export async function getMe(req, res) {
  res.json({
    ok: true,
    admin: publicUser(req.admin),
  })
}
