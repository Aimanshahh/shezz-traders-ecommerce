// ─────────────────────────────────────────────────────
// API layer — talks to the real backend.
// ─────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const TOKEN_KEY = 'shezz_admin_token'
const ADMIN_KEY = 'shezz_admin_user'

function getToken() {
  return (
    localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  )
}

// ─── Handle 401 — force logout ────────────────────────
function handleUnauthorized() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ADMIN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(ADMIN_KEY)

  // Redirect to admin login (only if not already there)
  if (
    typeof window !== 'undefined' &&
    !window.location.pathname.startsWith('/admin') ||
    window.location.pathname === '/admin/dashboard'
  ) {
    window.location.href = '/admin'
  }
}

// ─── Universal request helper ─────────────────────────
async function request(path, options = {}) {
  const token = getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  let data
  try {
    data = await res.json()
  } catch {
    data = {}
  }

  if (res.status === 401) {
    handleUnauthorized()
    throw new Error('Session expired. Please log in again.')
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`)
  }

  return data
}

// ══════════════════════════════════════════════════════
//  IMAGE UPLOAD
// ══════════════════════════════════════════════════════

export async function uploadImage(file) {
  const token = getToken()
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (res.status === 401) {
    handleUnauthorized()
    throw new Error('Session expired. Please log in again.')
  }

  let data
  try {
    data = await res.json()
  } catch {
    data = {}
  }
  if (!res.ok || !data.ok) throw new Error(data.message || 'Upload failed')
  return data.url
}

export async function uploadImages(files) {
  const token = getToken()
  const formData = new FormData()
  files.forEach((file) => formData.append('images', file))

  const res = await fetch(`${API_URL}/upload/multiple`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (res.status === 401) {
    handleUnauthorized()
    throw new Error('Session expired. Please log in again.')
  }

  let data
  try {
    data = await res.json()
  } catch {
    data = {}
  }
  if (!res.ok || !data.ok) throw new Error(data.message || 'Upload failed')
  return data.urls
}

// ══════════════════════════════════════════════════════
//  PRODUCTS
// ══════════════════════════════════════════════════════

export async function getProducts(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await request(`/products${qs ? `?${qs}` : ''}`)
  return data.products
}

export async function getProduct(id) {
  const data = await request(`/products/${id}`)
  return data.product
}

export async function createProduct(payload) {
  const data = await request('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.product
}

export async function updateProduct(id, payload) {
  const data = await request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return data.product
}

export async function deleteProduct(id) {
  await request(`/products/${id}`, { method: 'DELETE' })
  return { ok: true }
}

// ══════════════════════════════════════════════════════
//  CATEGORIES
// ══════════════════════════════════════════════════════

export async function getCategories() {
  const data = await request('/categories')
  return data.categories
}

export async function createCategory(payload) {
  const data = await request('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.category
}

export async function updateCategory(id, payload) {
  const data = await request(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return data.category
}

export async function deleteCategory(id) {
  await request(`/categories/${id}`, { method: 'DELETE' })
  return { ok: true }
}

// ══════════════════════════════════════════════════════
//  ORDERS
// ══════════════════════════════════════════════════════

export async function createOrder(payload) {
  const data = await request('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.order
}

export async function lookupOrders({ phone, orderNumber }) {
  const params = new URLSearchParams()
  if (phone) params.append('phone', phone)
  if (orderNumber) params.append('orderNumber', orderNumber)
  const data = await request(`/orders/lookup?${params.toString()}`)
  return data.orders
}

export async function getOrders(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await request(`/orders${qs ? `?${qs}` : ''}`)
  return data.orders
}

export async function updateOrderStatus(id, payload) {
  const data = await request(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.order
}

export async function deleteOrder(id) {
  await request(`/orders/${id}`, { method: 'DELETE' })
  return { ok: true }
}

// ══════════════════════════════════════════════════════
//  DASHBOARD STATS
// ══════════════════════════════════════════════════════

export async function getDashboardStats() {
  const data = await request('/orders/stats/dashboard')
  return data.stats
}