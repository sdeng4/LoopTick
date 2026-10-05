import { nextFireAt } from './tz.js'
import { sendCountdownEmail } from './mailer.js'

const BATCH = 50

// Emails the owner of every countdown whose fire time has passed, then moves
// the countdown to its next occurrence (or clears it for one-time countdowns).
export async function sendDueNotifications(db, appUrl) {
  const { rows } = await db.query(
    `SELECT c.*, u.email, u.username
     FROM public.countdowns c
     JOIN public.users u ON u.id = c.user_id
     WHERE c.notify_at IS NOT NULL AND c.notify_at <= now()
     ORDER BY c.notify_at
     LIMIT $1`,
    [BATCH]
  )

  let sent = 0
  for (const c of rows) {
    const after = new Date(c.notify_at.getTime() + 60_000)
    const next = c.repeat === 'none'
      ? null
      : nextFireAt(c.target, c.repeat, c.timezone, after > new Date() ? after : new Date(), c.repeat_every)

    // Claim the row first: if another run already advanced it, skip.
    // This keeps overlapping runs from sending the same email twice.
    const { rowCount } = await db.query(
      `UPDATE public.countdowns SET notify_at = $1
       WHERE id = $2 AND notify_at = $3`,
      [next, c.id, c.notify_at]
    )
    if (!rowCount) continue

    try {
      await sendCountdownEmail(c.email, c.username, c, appUrl)
      sent++
    } catch (err) {
      console.error(`Countdown ${c.id} email failed:`, err.message)
    }
  }
  return sent
}
