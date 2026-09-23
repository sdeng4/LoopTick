// target is a local-time string "YYYY-MM-DDTHH:mm"; new Date() parses it as local.

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()

// Build a date in (year, month) keeping the original day, clamped to month end
// (e.g. the 31st repeats on the 30th/28th in shorter months).
function withClampedDay(base, year, month) {
  const day = Math.min(base.getDate(), daysInMonth(year, month))
  return new Date(year, month, day, base.getHours(), base.getMinutes())
}

// Next occurrence at or after `now`. Returns null if a one-off has passed.
export function nextOccurrence(target, repeat, now = new Date()) {
  const base = new Date(target)
  if (base >= now) return base
  if (repeat === 'none') return null

  if (repeat === 'daily') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), base.getHours(), base.getMinutes())
    if (d < now) d.setDate(d.getDate() + 1)
    return d
  }
  if (repeat === 'monthly') {
    let d = withClampedDay(base, now.getFullYear(), now.getMonth())
    if (d < now) d = withClampedDay(base, now.getFullYear(), now.getMonth() + 1)
    return d
  }
  if (repeat === 'yearly') {
    let d = withClampedDay(base, now.getFullYear(), base.getMonth())
    if (d < now) d = withClampedDay(base, now.getFullYear() + 1, base.getMonth())
    return d
  }
  return null
}

export function breakdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  }
}

export const pad = (n) => String(n).padStart(2, '0')

// Current local time formatted for <input type="datetime-local">
export function nowLocalInput() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
