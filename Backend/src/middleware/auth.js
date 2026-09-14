import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'

export async function protect(req, res, next) {
  try {
    let token

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res
        .status(401)
        .json({ ok: false, message: 'Not authorized, no token' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.admin = await Admin.findById(decoded.id).select('-password')

    if (!req.admin) {
      return res
        .status(401)
        .json({ ok: false, message: 'Admin not found' })
    }

    next()
  } catch (err) {
    return res
      .status(401)
      .json({ ok: false, message: 'Not authorized, token invalid' })
  }
}