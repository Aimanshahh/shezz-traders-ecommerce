// ─────────────────────────────────────────────────────
// Admin auth — talks to the real backend.
// ─────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const TOKEN_KEY = 'shezz_admin_token'
const ADMIN_KEY = 'shezz_admin_user'

// ─── JWT payload decoder (no verification, just reads exp/role) ─
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isTokenExpired(token) {
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.exp) return true
  // exp is in seconds, Date.now is milliseconds
  return payload.exp * 1000 < Date.now()
}

export const isSalespersonRole = (role) =>
  String(role || '').trim().toLowerCase() === 'salesperson'

// ─── Login ────────────────────────────────────────────
export async function loginAdmin(email, password, remember = false) {
  const res = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json()

  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Invalid email or password.')
  }

  const storage = remember ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, data.token)
  storage.setItem(ADMIN_KEY, JSON.stringify(data.admin))

  return data.admin
}

// ─── Logout ───────────────────────────────────────────
export function logoutAdmin() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ADMIN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(ADMIN_KEY)
}

// ─── Get current admin user ───────────────────────────
export function getAdminUser() {
  try {
    const raw =
      localStorage.getItem(ADMIN_KEY) || sessionStorage.getItem(ADMIN_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// ─── Is admin logged in? (valid token and not a salesperson) ─
export function isAdminLoggedIn() {
  const token = getToken()
  if (!token) return false

  // Older tokens did not carry a role. Those can only belong to the owner, so
  // they keep working; new salesperson tokens are always rejected here.
  const role = getAdminUser()?.role || decodeJwtPayload(token)?.role
  return !isSalespersonRole(role)
}

// ─── Get raw token (used by api.js) ───────────────────
export function getToken() {
  const token =
    localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  if (!token) return null
  if (isTokenExpired(token)) {
    logoutAdmin()
    return null
  }
  return token
}
