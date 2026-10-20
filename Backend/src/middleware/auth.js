import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'
import { isSalespersonRole } from '../utils/roles.js'

// Any signed-in account (admin or salesperson).
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
        .json({ ok: false, message: 'Account not found' })
    }

    // Accounts are deactivated, never deleted, so old tokens stop working too.
    if (req.admin.isActive === false) {
      return res
        .status(403)
        .json({ ok: false, message: 'This account has been deactivated' })
    }

    next()
  } catch (err) {
    return res
      .status(401)
      .json({ ok: false, message: 'Not authorized, token invalid' })
  }
}

// Full administration. Salespeople are refused, and the check happens on the server
// so hiding buttons in the browser is never the only protection.
export function adminOnly(req, res, next) {
  if (isSalespersonRole(req.admin?.role)) {
    return res
      .status(403)
      .json({ ok: false, message: 'Admin access required for this action' })
  }
  next()
}

// Sale-entry endpoints. A salesperson account is required.
export function salespersonOnly(req, res, next) {
  if (!isSalespersonRole(req.admin?.role)) {
    return res
      .status(403)
      .json({ ok: false, message: 'Salesperson access required for this action' })
  }
  next()
}
