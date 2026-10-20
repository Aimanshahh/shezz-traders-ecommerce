// ─────────────────────────────────────────────────────
// Salesperson auth — same backend, separate browser session.
// A salesperson token is kept apart from the admin token so the two
// logins never overwrite each other in the same browser.
// ─────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const TOKEN_KEY = 'shezz_staff_token'
const USER_KEY = 'shezz_staff_user'

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
  return payload.exp * 1000 < Date.now()
}

// ─── Login (refuses anything that is not a salesperson account) ─────────
export async function loginStaff(email, password, remember = false) {
  const res = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json()

  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Invalid email or password.')
  }

  if (String(data.admin?.role || '').toLowerCase() !== 'salesperson') {
    throw new Error('This is an admin account. Please use the admin sign-in.')
  }

  const storage = remember ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, data.token)
  storage.setItem(USER_KEY, JSON.stringify(data.admin))

  return data.admin
}

export function logoutStaff() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function getStaffUser() {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getStaffToken() {
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  if (!token) return null
  if (isTokenExpired(token)) {
    logoutStaff()
    return null
  }
  return token
}

export function isStaffLoggedIn() {
  const token = getStaffToken()
  if (!token) return false
  const role = getStaffUser()?.role || decodeJwtPayload(token)?.role
  return String(role || '').toLowerCase() === 'salesperson'
}
