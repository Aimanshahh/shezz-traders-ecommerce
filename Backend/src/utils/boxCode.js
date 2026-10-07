// Box and carton codes come from barcodes like "A-233".
const CODE_RE = /^[A-Z0-9][A-Z0-9\-_/.]{0,39}$/

export const normalizeBoxCode = (value) => String(value ?? '').trim().toUpperCase()

export function checkBoxCode(raw) {
  const code = normalizeBoxCode(raw)
  if (!code) return { ok: false, message: 'Box code is required' }
  if (/^\d{15}$/.test(code)) {
    return { ok: false, message: 'That looks like an IMEI, not a box code' }
  }
  if (!CODE_RE.test(code)) {
    return {
      ok: false,
      message: 'Box code can only use letters, numbers and - _ / . (max 40 characters)',
    }
  }
  return { ok: true, code }
}