// ────────────────────────────────────────────────────────
// Contact form submission service
//
// TODAY  → saves submissions to localStorage (browser only)
// LATER  → swap `submitContact` to POST to your admin panel API
// ────────────────────────────────────────────────────────

const STORAGE_KEY = 'shezz_contact_submissions'

/**
 * Save a contact form submission.
 * @param {{ name: string, email: string, message: string }} data
 * @returns {Promise<{ ok: true, id: string, createdAt: string }>}
 */
export async function submitContact(data) {
  // ─── Option A (CURRENT): save to localStorage ─────────
  const submission = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: data.name.trim(),
    email: data.email.trim(),
    message: data.message.trim(),
    createdAt: new Date().toISOString(),
  }

  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    existing.push(submission)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {
    // localStorage unavailable (private mode, etc.)
  }

  // Simulate a small network delay so the button feels real
  await new Promise((r) => setTimeout(r, 500))

  return { ok: true, id: submission.id, createdAt: submission.createdAt }

  // ─── Option B (LATER, when admin panel is ready): ─────
  // const res = await fetch('https://your-admin-api.com/contact', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(submission),
  // })
  // if (!res.ok) throw new Error('Failed to send')
  // const json = await res.json()
  // return { ok: true, id: json.id, createdAt: json.createdAt }
}

/**
 * Read all submissions (for a future /admin page).
 */
export function getContactSubmissions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * Delete all submissions (dev utility).
 */
export function clearContactSubmissions() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}