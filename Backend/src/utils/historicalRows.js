// Parsing and matching helpers used only by the historical stock import.
// Kept separate from utils/Imei.js on purpose: the live scanners keep their strict
// behaviour, and only this importer may relax the check digit for one file.

const MONTH_NAMES = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30)
const MIN_YEAR = 1990
const MAX_YEAR = 2100

export function normalizeImei(raw) {
  if (raw === null || raw === undefined) return ''
  return String(raw).replace(/[\s-]/g, '').trim()
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

// 15 digits and uniqueness are always enforced. The Luhn check digit is the only part
// that can be relaxed, per import, for genuinely old devices.
export function validateHistoricalImei(raw, { allowFailedChecksum = false } = {}) {
  const imei = normalizeImei(raw)
  if (!imei) return { valid: false, imei, reason: 'Empty value' }
  if (/^\d+(\.\d+)?e[+-]?\d+$/i.test(imei)) {
    return {
      valid: false,
      imei,
      reason: 'Excel turned this into a number. Format the IMEI column as Text',
    }
  }
  if (!/^\d+$/.test(imei)) return { valid: false, imei, reason: 'Contains non-digit characters' }
  if (imei.length !== 15) {
    return { valid: false, imei, reason: `Must be 15 digits (got ${imei.length})` }
  }
  const checksumOk = passesCheckDigit(imei)
  if (!checksumOk && !allowFailedChecksum) {
    return {
      valid: false,
      imei,
      reason: 'Failed IMEI check digit. Correct it, or allow old IMEIs for this import',
    }
  }
  return { valid: true, imei, checksumOk }
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function fromExcelSerial(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1 || n > 80000) return null
  const ms = EXCEL_EPOCH + Math.round(n) * 86400000
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? null : d
}

// UTC midnight keeps a date stable regardless of the server's timezone.
function utcDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null
  }
  return d
}

function fullYear(raw) {
  const y = Number(raw)
  if (!Number.isInteger(y)) return null
  if (y < 100) return y > 70 ? 1900 + y : 2000 + y
  return y
}

// '2023-01', 'Jan-2023', 'January 2023', '01/2023', an Excel serial, or a full date.
export function parseMonth(value) {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}`
  }
  if (typeof value === 'number') {
    const d = fromExcelSerial(value)
    return d ? `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}` : null
  }

  const s = String(value).trim()
  if (!s) return null
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const d = fromExcelSerial(Number(s))
    return d ? `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}` : null
  }

  // 2023-01 / 2023/1
  let m = s.match(/^(\d{4})[\/\-.](\d{1,2})$/)
  if (m) {
    const year = fullYear(m[1])
    const month = Number(m[2])
    return year && month >= 1 && month <= 12 ? `${year}-${pad2(month)}` : null
  }
  // 01/2023 / 1-2023
  m = s.match(/^(\d{1,2})[\/\-.](\d{4})$/)
  if (m) {
    const month = Number(m[1])
    const year = fullYear(m[2])
    return year && month >= 1 && month <= 12 ? `${year}-${pad2(month)}` : null
  }
  // Jan-2023 / January 2023 / Jan'23
  m = s.match(/^([a-z]{3,9})[\s\/'.,-]*(\d{2,4})$/i)
  if (m) {
    const month = MONTH_NAMES[m[1].toLowerCase()]
    const year = fullYear(m[2])
    return month && year ? `${year}-${pad2(month)}` : null
  }
  // A full date: take its month.
  const d = parseSaleDate(s, { dateOrder: 'dmy' })
  return d ? `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}` : null
}

// A full sale date. Pakistan writes day first, so DMY is the default; MDY is optional.
export function parseSaleDate(value, { dateOrder = 'dmy' } = {}) {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') return fromExcelSerial(value)

  const s = String(value).trim()
  if (!s) return null
  if (/^\d{5}(\.\d+)?$/.test(s)) return fromExcelSerial(Number(s))

  // 2023-01-05 / 2023/1/5
  let m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/)
  if (m) return utcDate(fullYear(m[1]), Number(m[2]), Number(m[3]))

  // 05/01/2023 or 01/05/2023
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    const year = fullYear(m[3])
    if (!year) return null
    return dateOrder === 'mdy' ? utcDate(year, a, b) : utcDate(year, b, a)
  }

  // 5 Jan 2023 / 05-Jan-23
  m = s.match(/^(\d{1,2})[\s\-/.]+([a-z]{3,9})[\s\-/.,]+(\d{2,4})$/i)
  if (m) {
    const month = MONTH_NAMES[m[2].toLowerCase()]
    return month ? utcDate(fullYear(m[3]), month, Number(m[1])) : null
  }
  // Jan 5 2023 / Jan-05-2023
  m = s.match(/^([a-z]{3,9})[\s\-/.,]+(\d{1,2})[\s\-/.,]+(\d{2,4})$/i)
  if (m) {
    const month = MONTH_NAMES[m[1].toLowerCase()]
    return month ? utcDate(fullYear(m[3]), month, Number(m[2])) : null
  }

  // ISO timestamps written by other tools.
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

const HONORIFICS =
  /\b(mr|mrs|ms|miss|mister|dr|shri|smt|sri|s\/o|d\/o|w\/o|bin|binti|binte)\b\.?/gi

export function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(HONORIFICS, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost)
    }
    previous = current
  }
  return previous[b.length]
}

// 1 = identical after normalisation. Combines edit distance with token overlap so
// "Muhammad Ali Khan" and "Ali Khan" score highly, while unrelated names stay low.
export function nameSimilarity(a, b) {
  const x = normalizeName(a)
  const y = normalizeName(b)
  if (!x || !y) return 0
  if (x === y) return 1
  const lev = 1 - levenshtein(x, y) / Math.max(x.length, y.length)
  const tokensA = new Set(x.split(' '))
  const tokensB = new Set(y.split(' '))
  let shared = 0
  tokensA.forEach((t) => {
    if (tokensB.has(t)) shared += 1
  })
  const tokenScore = shared / Math.max(tokensA.size, tokensB.size)
  return Math.max(lev, tokenScore)
}
