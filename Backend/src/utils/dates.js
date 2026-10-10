// Adds calendar months and keeps the day (05 Oct + 6 months = 05 Apr).
// If the day does not exist in the target month it falls back to the last day.
export function addMonths(date, months) {
  const d = new Date(date)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return d
}