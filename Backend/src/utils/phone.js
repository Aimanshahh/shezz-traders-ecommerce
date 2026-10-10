// Stores phone numbers in one local format so "+92 300 1234567" and "03001234567" match.
export function normalizePhone(value) {
  let d = String(value ?? '').replace(/\D/g, '')
  if (d.startsWith('0092')) d = d.slice(2) // 0092300... -> 92300...
  if (d.startsWith('92') && d.length === 12) d = `0${d.slice(2)}`
  else if (d.length === 10 && d.startsWith('3')) d = `0${d}`
  return d
}

export const isValidPhone = (d) => d.length >= 7 && d.length <= 15