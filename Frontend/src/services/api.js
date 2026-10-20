// ─────────────────────────────────────────────────────
// API layer — talks to the real backend.
// ─────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const TOKEN_KEY = 'shezz_admin_token'
const ADMIN_KEY = 'shezz_admin_user'
const STAFF_TOKEN_KEY = 'shezz_staff_token'
const STAFF_USER_KEY = 'shezz_staff_user'

const onStaffPage = () =>
  typeof window !== 'undefined' && window.location.pathname.startsWith('/staff')

function getToken() {
  // Each side reads its own session, so an admin and a salesperson can be signed
  // in on the same machine without sending the wrong token.
  const key = onStaffPage() ? STAFF_TOKEN_KEY : TOKEN_KEY
  return localStorage.getItem(key) || sessionStorage.getItem(key)
}

// ─── Handle 401 — force logout ────────────────────────
function handleUnauthorized() {
  const staff = onStaffPage()
  const tokenKey = staff ? STAFF_TOKEN_KEY : TOKEN_KEY
  const userKey = staff ? STAFF_USER_KEY : ADMIN_KEY

  localStorage.removeItem(tokenKey)
  localStorage.removeItem(userKey)
  sessionStorage.removeItem(tokenKey)
  sessionStorage.removeItem(userKey)

  if (typeof window === 'undefined') return
  const path = window.location.pathname
  if (staff) {
    if (path !== '/staff') window.location.href = '/staff'
    return
  }
  if (path !== '/admin' || path === '/admin/dashboard') {
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

// ══════════════════════════════════════════════════════
//  DEVICES / IMEI  (CRM)
//  Paste this block at the END of services/api.js.
//  It only adds new functions. Nothing existing changes.
// ══════════════════════════════════════════════════════

export async function getDevices(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  )
  const qs = new URLSearchParams(clean).toString()
  return request(`/devices${qs ? `?${qs}` : ''}`) // { devices, total, page, pages }
}

export async function getDeviceStats() {
  return request('/devices/stats') // { stats }
}

export async function getDevice(id) {
  return request(`/devices/${id}`) // { device, history }
}

export async function addDevice(payload) {
  const data = await request('/devices', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.device
}

export async function scanDevice(imei) {
  return request('/devices/scan', {
    method: 'POST',
    body: JSON.stringify({ imei }),
  })
}

export async function previewDeviceImport(payload) {
  return request('/devices/import/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function importDevices(payload) {
  return request('/devices/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateDeviceStatus(id, payload) {
  const data = await request(`/devices/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.device
}

// ══════════════════════════════════════════════════════
//  BOXES / CARTONS  (CRM)
//  below the devices block. Only adds new functions.
// ══════════════════════════════════════════════════════

export async function getBoxes(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  )
  const qs = new URLSearchParams(clean).toString()
  return request(`/boxes${qs ? `?${qs}` : ''}`) // { boxes, total, page, pages }
}

export async function getBox(id) {
  return request(`/boxes/${id}`) // { box, devices, children }
}

export async function createBox(payload) {
  const data = await request('/boxes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.box
}

export async function updateBox(id, payload) {
  const data = await request(`/boxes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.box
}

export async function deleteBox(id) {
  await request(`/boxes/${id}`, { method: 'DELETE' })
  return { ok: true }
}

export async function addDevicesToBox(id, payload) {
  return request(`/boxes/${id}/devices`, {
    method: 'POST',
    body: JSON.stringify(payload), // { imeis: [...], productId? }
  }) // { results, total, expectedCount, overCapacity }
}

export async function removeDeviceFromBox(id, deviceId) {
  await request(`/boxes/${id}/devices/${deviceId}`, { method: 'DELETE' })
  return { ok: true }
}

export async function addBoxesToCarton(id, codes) {
  return request(`/boxes/${id}/boxes`, {
    method: 'POST',
    body: JSON.stringify({ codes }),
  }) // { results, boxesInCarton }
}
// ══════════════════════════════════════════════════════
//  SALES, CUSTOMERS, CRM SETTINGS  (CRM)
//  Paste this block at the END of services/api.js,
//  below the boxes block. Only adds new functions.
// ══════════════════════════════════════════════════════

export async function resolveCode(code) {
  return request('/sales/resolve', {
    method: 'POST',
    body: JSON.stringify({ code }),
  }) // { kind, label, items, counts } or { kind: 'invalid' | 'not_found', message }
}

export async function createSale(payload) {
  const data = await request('/sales', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.sale // { _id, invoiceNumber }
}

export async function getSales(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  )
  const qs = new URLSearchParams(clean).toString()
  return request(`/sales${qs ? `?${qs}` : ''}`) // { sales, total, page, pages, totals }
}

export async function getSale(id) {
  return request(`/sales/${id}`) // { sale, items, settings }
}

export async function updateInvoiceEmail(id, email, action) {
  return request(`/sales/${id}/email`, {
    method: 'POST',
    body: JSON.stringify({ email, action }),
  })
}

export async function lookupCustomer(phone) {
  return request(`/customers/lookup?phone=${encodeURIComponent(phone)}`) // { customer, stats }
}

export async function getCustomers(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  )
  const qs = new URLSearchParams(clean).toString()
  return request(`/customers${qs ? `?${qs}` : ''}`)
}

export async function getCustomer(id) {
  return request(`/customers/${id}`) // { customer, stats, sales, devices }
}

export async function createCustomer(payload) {
  const data = await request('/customers', { method: 'POST', body: JSON.stringify(payload) })
  return data.customer
}

export async function updateCustomer(id, payload) {
  const data = await request(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.customer
}

export async function getCrmSettings() {
  const data = await request('/crm-settings')
  return data.settings
}

export async function saveCrmSettings(payload) {
  const data = await request('/crm-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return data.settings
}

// ══════════════════════════════════════════════════════
//  DELETE (test data cleanup)
//  Paste this block at the END of services/api.js.
// ══════════════════════════════════════════════════════

export async function deleteDevice(id) {
  return request(`/devices/${id}`, { method: 'DELETE' })
}

export async function deleteSale(id) {
  return request(`/sales/${id}`, { method: 'DELETE' })
}
// ══════════════════════════════════════════════════════
//  LEDGER, PAYMENTS, HANDOVERS  (CRM)
//  Paste this block at the END of services/api.js.
// ══════════════════════════════════════════════════════

export async function getLedger(customerId, params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  const qs = new URLSearchParams(clean).toString()
  return request(`/customers/${customerId}/ledger${qs ? `?${qs}` : ''}`)
}

export async function recordPayment(customerId, payload) {
  const data = await request(`/customers/${customerId}/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.payment
}

export async function voidPayment(paymentId, reason = '') {
  return request(`/payments/${paymentId}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function resolveTransfer(code, fromCustomerId) {
  return request('/transfers/resolve', {
    method: 'POST',
    body: JSON.stringify({ code, fromCustomerId }),
  }) // { kind, label, items:[{imei,eligible,reason,product,box}], counts } | { kind:'invalid'|'not_found', message }
}

export async function createTransfer(payload) {
  return request('/transfers', {
    method: 'POST',
    body: JSON.stringify(payload),
  }) // { receiverId, count }
}

export async function deleteCustomer(id) {
  return request(`/customers/${id}`, { method: 'DELETE' })
}

export async function lookupReturnDevice(imei) {
  const qs = new URLSearchParams({ imei }).toString()
  return request(`/returns/lookup?${qs}`)
}

export async function getReturnCases(params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  const qs = new URLSearchParams(clean).toString()
  return request(`/returns${qs ? `?${qs}` : ''}`)
}

export async function getReturnCase(id) {
  const data = await request(`/returns/${id}`)
  return { ...data.returnCase, refundableLimit: data.refundableLimit }
}

export async function openReturnCase(payload) {
  const data = await request('/returns', { method: 'POST', body: JSON.stringify(payload) })
  return data.returnCase
}

export async function resolveReturnCase(id, payload) {
  const data = await request(`/returns/${id}/resolve`, { method: 'PATCH', body: JSON.stringify(payload) })
  return data.returnCase
}

export async function cancelReturnCase(id) {
  return request(`/returns/${id}/cancel`, { method: 'POST' })
}

export async function getAdminOverview() {
  const data = await request('/reports/overview')
  return data.overview
}

export async function getAdminReport(params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  const qs = new URLSearchParams(clean).toString()
  return request(`/reports/summary${qs ? `?${qs}` : ''}`)
}
// ══════════════════════════════════════════════════════
//  SALESPERSON  (/api/staff)
//  Responses here never carry prices, totals or customer balances.
// ══════════════════════════════════════════════════════

export async function getStaffCustomers(params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  const qs = new URLSearchParams(clean).toString()
  return request(`/staff/customers${qs ? `?${qs}` : ''}`)
}

export async function getStaffProducts() {
  const data = await request('/staff/products')
  return data.products
}

export async function staffScan(code) {
  return request('/staff/scan', { method: 'POST', body: JSON.stringify({ code }) })
}

export async function staffRegisterDevice(payload) {
  const data = await request('/staff/devices', { method: 'POST', body: JSON.stringify(payload) })
  return data.device
}

export async function createStaffSale(payload) {
  const data = await request('/staff/sales', { method: 'POST', body: JSON.stringify(payload) })
  return data.sale
}

export async function getStaffSales() {
  const data = await request('/staff/sales')
  return data.sales
}

export async function getStaffSale(id) {
  return request(`/staff/sales/${id}`)
}

// ══════════════════════════════════════════════════════
//  STAFF ACCOUNTS, CUSTOMER RATES, SALE REVIEW  (admin)
// ══════════════════════════════════════════════════════

export async function getAdminUsers() {
  const data = await request('/admin/users')
  return data.users
}

export async function createAdminUser(payload) {
  const data = await request('/admin/users', { method: 'POST', body: JSON.stringify(payload) })
  return data.user
}

export async function updateAdminUser(id, payload) {
  const data = await request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  return data.user
}

export async function deleteAdminUser(id) {
  return request(`/admin/users/${id}`, { method: 'DELETE' })
}

export async function saveCustomerPrices(id, prices) {
  const data = await request(`/customers/${id}/prices`, {
    method: 'PUT',
    body: JSON.stringify({ prices }),
  })
  return data.prices
}

export async function approveSale(id, payload = {}) {
  const data = await request(`/sales/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.sale
}

export async function rejectSale(id, reason = '') {
  return request(`/sales/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}
