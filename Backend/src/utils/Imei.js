// Set to false if some of your devices have IMEIs that fail the standard check digit.
const STRICT_CHECKSUM = true

export function normalizeImei(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[\s-]/g, '').trim()
}

function passesCheckDigit(digits) {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

export function validateImei(raw) {
  const imei = normalizeImei(raw)
  if (!imei) return { valid: false, imei, reason: 'Empty value' }
  if (/^\d+(\.\d+)?e[+-]?\d+$/i.test(imei)) {
    return {
      valid: false,
      imei,
      reason: 'Excel turned this into a number. Format the IMEI column as Text',
    }
  }
  if (!/^\d+$/.test(imei)) {
    return { valid: false, imei, reason: 'Contains non-digit characters' }
  }
  if (imei.length !== 15) {
    return { valid: false, imei, reason: `Must be 15 digits (got ${imei.length})` }
  }
  if (STRICT_CHECKSUM && !passesCheckDigit(imei)) {
    return { valid: false, imei, reason: 'Failed IMEI check digit (likely a typo)' }
  }
  return { valid: true, imei }
}