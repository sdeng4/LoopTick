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

// Next instant at or after `now` when the countdown fires, or null if a
// one-time countdown has already passed. Mirrors nextOccurrence in src/time.js.
export function nextFireAt(target, repeat, tz, now = new Date()) {
  const base = parseTarget(target)
  const wallNow = toWall(now, tz)
  let next = null

  if (base >= wallNow) {
    next = base
  } else if (repeat === 'daily') {
    next = new Date(Date.UTC(
      wallNow.getUTCFullYear(), wallNow.getUTCMonth(), wallNow.getUTCDate(),
      base.getUTCHours(), base.getUTCMinutes()
    ))
    if (next < wallNow) next.setUTCDate(next.getUTCDate() + 1)
  } else if (repeat === 'monthly') {
    next = withClampedDay(base, wallNow.getUTCFullYear(), wallNow.getUTCMonth())
    if (next < wallNow) {
      next = withClampedDay(base, wallNow.getUTCFullYear(), wallNow.getUTCMonth() + 1)
    }
  } else if (repeat === 'yearly') {
    next = withClampedDay(base, wallNow.getUTCFullYear(), base.getUTCMonth())
    if (next < wallNow) {
      next = withClampedDay(base, wallNow.getUTCFullYear() + 1, base.getUTCMonth())
    }
  }

  return next && toInstant(next, tz)
}
