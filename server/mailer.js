import nodemailer from 'nodemailer'
import { repeatPhrase } from './tz.js'

let transport = null

function getTransport() {
  if (transport) return transport
  if (!process.env.SMTP_HOST) return null

  const port = Number(process.env.SMTP_PORT || 587)
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  return transport
}

export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]))

function layout(heading, body) {
  return `
<div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f1115">
  <div style="font-weight:700;font-size:18px;margin-bottom:20px">⟳ LoopTick</div>
  <h2 style="font-size:20px;margin:0 0 12px">${heading}</h2>
  ${body}
  <p style="font-size:12px;color:#6b7280;margin-top:32px">You are receiving this email because you have a LoopTick account.</p>
</div>`
}

const button = (href, label) =>
  `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="background:#0f1115;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${label}</a></p>`

export async function sendMail({ to, subject, text, html }) {
  const t = getTransport()
  if (!t) {
    // No SMTP configured (local dev): print the email so links are still usable.
    console.log(`\n[mail] SMTP not configured. Email to ${to}\nSubject: ${subject}\n${text}\n`)
    return
  }
  await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  })
}

export function sendVerificationEmail(to, username, link) {
  return sendMail({
    to,
    subject: 'Verify your LoopTick email address',
    text: `Hi ${username},\n\nConfirm your email address to activate your LoopTick account:\n${link}\n\nThis link expires in 24 hours. If you did not sign up, you can ignore this email.`,
    html: layout(
      `Hi ${escapeHtml(username)}, confirm your email`,
      `<p style="font-size:14px;line-height:1.6">Click the button below to activate your LoopTick account.</p>
       ${button(link, 'Verify email address')}
       <p style="font-size:12px;color:#6b7280">This link expires in 24 hours. If you did not sign up, you can ignore this email.</p>`
    ),
  })
}

export function sendCountdownEmail(to, username, countdown, appUrl) {
  const repeating = countdown.repeat !== 'none'
  const nextLine = repeating
    ? `This countdown repeats ${repeatPhrase(countdown.repeat, countdown.repeat_every)}, so it has restarted for the next occurrence.`
    : 'This was a one-time countdown and is now complete.'

  return sendMail({
    to,
    subject: `⏰ "${countdown.title}" has reached its time`,
    text: `Hi ${username},\n\nYour countdown "${countdown.title}" has reached its target time (${countdown.target.replace('T', ' ')}).\n${countdown.note ? `\nNotes: ${countdown.note}\n` : ''}\n${nextLine}\n\n${appUrl}`,
    html: layout(
      `"${escapeHtml(countdown.title)}" has reached its time`,
      `<p style="font-size:14px;line-height:1.6">Hi ${escapeHtml(username)}, your countdown reached its target time
         <b style="font-family:Consolas,monospace">${escapeHtml(countdown.target.replace('T', ' '))}</b>.</p>
       ${countdown.note ? `<p style="font-size:14px;line-height:1.6;background:#f3f4f6;padding:10px 12px;border-radius:8px">${escapeHtml(countdown.note)}</p>` : ''}
       <p style="font-size:14px;line-height:1.6">${nextLine}</p>
       ${button(appUrl, 'Open LoopTick')}`
    ),
  })
}
