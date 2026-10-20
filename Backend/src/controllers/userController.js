import mongoose from 'mongoose'
import Admin from '../models/Admin.js'
import Sale from '../models/Sale.js'
import { ROLE_SALESPERSON, isSalespersonRole } from '../utils/roles.js'

const safeUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  isActive: u.isActive !== false,
  createdAt: u.createdAt,
  lastLoginAt: u.lastLoginAt || null,
})

// GET /api/admin/users
export async function listUsers(req, res, next) {
  try {
    const users = await Admin.find({}).select('-password').sort({ createdAt: 1 }).lean()
    const ids = users.map((u) => u._id)
    const counts = ids.length
      ? await Sale.aggregate([
          { $match: { salesperson: { $in: ids }, status: 'pending' } },
          { $group: { _id: '$salesperson', count: { $sum: 1 } } },
        ])
      : []
    const byId = new Map(counts.map((c) => [String(c._id), c.count]))
    res.json({
      ok: true,
      users: users.map((u) => ({
        ...safeUser(u),
        isSalesperson: isSalespersonRole(u.role),
        pendingSales: byId.get(String(u._id)) || 0,
      })),
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/users   { name, email, password }
// Only salesperson accounts can be created here; admin accounts come from the server env.
export async function createUser(req, res, next) {
  try {
    const name = String(req.body?.name ?? '').trim()
    const email = String(req.body?.email ?? '').toLowerCase().trim()
    const password = String(req.body?.password ?? '')

    if (!name) return res.status(400).json({ ok: false, message: 'Name is required' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, message: 'Enter a valid email address' })
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: 'Password must be at least 6 characters' })
    }
    if (await Admin.exists({ email })) {
      return res.status(409).json({ ok: false, message: 'An account with this email already exists' })
    }

    const user = await Admin.create({
      name,
      email,
      password,
      role: ROLE_SALESPERSON,
      isActive: true,
      createdBy: req.admin?._id || null,
    })

    res.status(201).json({ ok: true, user: safeUser(user) })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/admin/users/:id   { name, email, password, isActive }
export async function updateUser(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid account id' })
    }
    const user = await Admin.findById(req.params.id)
    if (!user) return res.status(404).json({ ok: false, message: 'Account not found' })
    if (!isSalespersonRole(user.role)) {
      return res.status(400).json({ ok: false, message: 'Only salesperson accounts can be managed here' })
    }

    const b = req.body || {}
    if (b.name !== undefined) {
      const name = String(b.name).trim()
      if (!name) return res.status(400).json({ ok: false, message: 'Name cannot be empty' })
      user.name = name
    }
    if (b.email !== undefined) {
      const email = String(b.email).toLowerCase().trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ ok: false, message: 'Enter a valid email address' })
      }
      const clash = await Admin.findOne({ email, _id: { $ne: user._id } }).select('_id').lean()
      if (clash) return res.status(409).json({ ok: false, message: 'Another account already uses this email' })
      user.email = email
    }
    if (b.password !== undefined) {
      const password = String(b.password)
      if (password.length < 6) {
        return res.status(400).json({ ok: false, message: 'Password must be at least 6 characters' })
      }
      user.password = password
    }
    if (b.isActive !== undefined) user.isActive = Boolean(b.isActive)

    await user.save()
    res.json({ ok: true, user: safeUser(user) })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/admin/users/:id
// A salesperson with submissions is deactivated instead, so sale history is never orphaned.
export async function deleteUser(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid account id' })
    }
    const user = await Admin.findById(req.params.id)
    if (!user) return res.status(404).json({ ok: false, message: 'Account not found' })
    if (!isSalespersonRole(user.role)) {
      return res.status(400).json({ ok: false, message: 'Only salesperson accounts can be deleted here' })
    }
    if (await Sale.exists({ salesperson: user._id })) {
      return res.status(400).json({
        ok: false,
        message: 'This salesperson has submitted sales. Deactivate the account instead.',
      })
    }
    await user.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
