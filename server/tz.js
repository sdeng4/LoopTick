// Server-side twin of src/time.js. Countdown targets are wall-clock strings
// ("YYYY-MM-DDTHH:mm") in the creator's timezone, so the server needs that
// timezone to know the real instant a countdown fires.
//
// Wall-clock values are represented as "naive" Dates whose UTC fields hold the
// local fields; only toInstant() turns them into real points in time.

export function isValidTimezone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const formatters = new Map()
function formatter(tz) {
  if (!formatters.has(tz)) {
    formatters.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    }))
  }
  return formatters.get(tz)
}

// Real instant -> naive wall-clock Date in tz
function toWall(instant, tz) {
  const p = {}
  for (const { type, value } of formatter(tz).formatToParts(instant)) {
    p[type] = Number(value)
  }
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second))
}

// Naive wall-clock Date in tz -> real instant (handles DST shifts)
function toInstant(wall, tz) {
  const offset = (t) => toWall(new Date(t), tz).getTime() - t
  let t = wall.getTime() - offset(wall.getTime())
  t = wall.getTime() - offset(t)
  return new Date(t)
}

const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

function withClampedDay(base, year, month) {
  const day = Math.min(base.getUTCDate(), daysInMonth(year, month))
  return new Date(Date.UTC(year, month, day, base.getUTCHours(), base.getUTCMinutes()))
}

function parseTarget(target) {
  const [d, t] = target.split('T')
  const [y, mo, day] = d.split('-').map(Number)
  const [h, mi] = t.split(':').map(Number)
  return new Date(Date.UTC(y, mo - 1, day, h, mi))
}

const DAY_STEP = { daily: 1, weekly: 7 }
const MONTH_STEP = { monthly: 1, yearly: 12 }

// Next instant at or after `now` when the countdown fires, or null if a
// one-time countdown has already passed. Mirrors nextOccurrence in src/time.js:
// occurrences are target + k * (every × unit).
export function nextFireAt(target, repeat, tz, now = new Date(), every = 1) {
  const base = parseTarget(target)
  const wallNow = toWall(now, tz)
  const n = Math.max(1, Number(every) || 1)
  let next = null

  if (base >= wallNow) {
    next = base
  } else if (DAY_STEP[repeat]) {
    const step = DAY_STEP[repeat] * n
    const dayMs = 86400_000
    const diff = Math.floor(wallNow / dayMs) - Math.floor(base / dayMs)
    let k = Math.floor(diff / step)
    const at = (k) => new Date(base.getTime() + k * step * dayMs)
    while (at(k) < wallNow) k++
    next = at(k)
  } else if (MONTH_STEP[repeat]) {
    const step = MONTH_STEP[repeat] * n
    const diff = (wallNow.getUTCFullYear() - base.getUTCFullYear()) * 12 +
      wallNow.getUTCMonth() - base.getUTCMonth()
    let k = Math.floor(diff / step)
    const at = (k) => withClampedDay(base, base.getUTCFullYear(), base.getUTCMonth() + k * step)
    while (at(k) < wallNow) k++
    next = at(k)
  }

  return next && toInstant(next, tz)
}

const UNIT = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }

// "every day", "every 2 months"… (mirrors repeatLabel in src/time.js)
export function repeatPhrase(repeat, every = 1) {
  const n = Number(every) || 1
  return n === 1 ? `every ${UNIT[repeat]}` : `every ${n} ${UNIT[repeat]}s`
}
