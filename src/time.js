// target is a local-time string "YYYY-MM-DDTHH:mm"; new Date() parses it as local.
// A repeating countdown fires at target, then every `every` days/weeks/months/years after it.

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()

// Build a date in (year, month) keeping the original day, clamped to month end
// (e.g. the 31st repeats on the 30th/28th in shorter months).
function withClampedDay(base, year, month) {
  const day = Math.min(base.getDate(), daysInMonth(year, month))
  return new Date(year, month, day, base.getHours(), base.getMinutes())
}

const DAY_STEP = { daily: 1, weekly: 7 }
const MONTH_STEP = { monthly: 1, yearly: 12 }

// Next occurrence at or after `now`. Returns null if a one-off has passed.
export function nextOccurrence(target, repeat, now = new Date(), every = 1) {
  const base = new Date(target)
  if (base >= now) return base
  if (repeat === 'none') return null
  const n = Math.max(1, Number(every) || 1)

  if (DAY_STEP[repeat]) {
    const step = DAY_STEP[repeat] * n
    // Whole calendar days between base and now, ignoring DST hour shifts
    const diff = Math.round(
      (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
       Date.UTC(base.getFullYear(), base.getMonth(), base.getDate())) / 86400_000
    )
    let k = Math.floor(diff / step)
    const at = (k) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + k * step,
      base.getHours(), base.getMinutes())
    while (at(k) < now) k++
    return at(k)
  }

  if (MONTH_STEP[repeat]) {
    const step = MONTH_STEP[repeat] * n
    const diff = (now.getFullYear() - base.getFullYear()) * 12 + now.getMonth() - base.getMonth()
    let k = Math.floor(diff / step)
    const at = (k) => withClampedDay(base, base.getFullYear(), base.getMonth() + k * step)
    while (at(k) < now) k++
    return at(k)
  }
  return null
}

const UNIT = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }
const PRESET_LABEL = { none: 'One-time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }

// "Daily", "Every 2 months", "Every 3 years"…
export function repeatLabel(repeat, every = 1) {
  const n = Number(every) || 1
  if (repeat === 'none' || n === 1) return PRESET_LABEL[repeat]
  return `Every ${n} ${UNIT[repeat]}s`
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
