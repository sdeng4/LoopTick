import express from 'express'
import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { sendVerificationEmail } from './mailer.js'

const scrypt = promisify(crypto.scrypt)

const COOKIE = 'lt_session'
const SESSION_DAYS = 30
const VERIFY_HOURS = 24
const RESEND_COOLDOWN_SECONDS = 60

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ---------- passwords ----------

async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

async function checkPassword(password, stored) {
  const [, salt, key] = stored.split('$')
  const expected = Buffer.from(key, 'base64')
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length)
  return crypto.timingSafeEqual(actual, expected)
}

// Used when the email is unknown so login timing does not reveal which emails exist
const DUMMY_HASH = await hashPassword(crypto.randomBytes(16).toString('hex'))

// ---------- session cookie ----------

function secret() {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET must be set in server/.env (at least 32 characters)')
  }
  return s
}

const sign = (data) =>
  crypto.createHmac('sha256', secret()).update(data).digest('base64url')

function createSession(userId) {
  const expires = Date.now() + SESSION_DAYS * 86400_000
  const data = `${userId}.${expires}`
  return `${data}.${sign(data)}`
}

function readSession(token) {
  const parts = String(token ?? '').split('.')
  if (parts.length !== 3) return null
  const [userId, expires, sig] = parts
  const expected = sign(`${userId}.${expires}`)
  if (sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null
  }
  if (Number(expires) < Date.now()) return null
  return Number(userId)
}

function getCookie(req, name) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production' || !!process.env.VERCEL,
  path: '/',
})

function setSession(res, userId) {
  res.cookie(COOKIE, createSession(userId), {
    ...cookieOptions(),
    maxAge: SESSION_DAYS * 86400_000,
  })
}

// ---------- helpers ----------

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex')

export function appUrl(req) {
  return (process.env.APP_URL || `${req.protocol}://${req.get('host')}`)
    .replace(/\/+$/, '')
}

const publicUser = (u) => ({ id: u.id, email: u.email, username: u.username })

async function issueVerification(db, req, user) {
  const token = crypto.randomBytes(32).toString('base64url')
  await db.query(
    `UPDATE public.users
     SET verify_token_hash = $1,
         verify_expires_at = now() + make_interval(hours => $2),
         verify_sent_at = now()
     WHERE id = $3`,
    [hashToken(token), VERIFY_HOURS, user.id]
  )
  const link = `${appUrl(req)}/api/auth/verify?token=${token}`
  await sendVerificationEmail(user.email, user.username, link)
}

// ---------- middleware ----------

export function requireAuth(db) {
  return async (req, res, next) => {
    try {
      const userId = readSession(getCookie(req, COOKIE))
      if (!userId) return res.status(401).json({ error: 'Please log in' })

      const { rows } = await db.query(
        `SELECT id, email, username FROM public.users
         WHERE id = $1 AND email_verified_at IS NOT NULL`,
        [userId]
      )
      if (!rows.length) return res.status(401).json({ error: 'Please log in' })

      req.user = rows[0]
      next()
    } catch (err) {
      next(err)
    }
  }
}

// ---------- routes ----------

export function authRouter(db, route) {
  const r = express.Router()

  r.post('/signup', route(async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const username = String(req.body?.username ?? '').trim()
    const password = String(req.body?.password ?? '')

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }
    if (username.length < 2 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 2–30 characters' })
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be 8–128 characters' })
    }

    const passwordHash = await hashPassword(password)
    const { rows: existing } = await db.query(
      'SELECT id, email_verified_at FROM public.users WHERE email = $1',
      [email]
    )

    let user
    if (existing.length && existing[0].email_verified_at) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please log in.',
      })
    } else if (existing.length) {
      // Unverified signup for the same email: replace the pending details and resend
      const { rows } = await db.query(
        `UPDATE public.users SET username = $1, password_hash = $2
         WHERE id = $3 RETURNING *`,
        [username, passwordHash, existing[0].id]
      )
      user = rows[0]
    } else {
      // ON CONFLICT guards the race where two signups for one email arrive together
      const { rows } = await db.query(
        `INSERT INTO public.users (email, username, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO NOTHING RETURNING *`,
        [email, username, passwordHash]
      )
      if (!rows.length) {
        return res.status(409).json({
          error: 'An account with this email already exists. Please log in.',
        })
      }
      user = rows[0]
    }

    await issueVerification(db, req, user)
    res.status(201).json({
      message: `We sent a verification link to ${email}. Please check your inbox.`,
    })
  }))

  r.get('/verify', route(async (req, res) => {
    const token = String(req.query.token ?? '')
    const { rows } = await db.query(
      `UPDATE public.users
       SET email_verified_at = now(),
           verify_token_hash = NULL,
           verify_expires_at = NULL
       WHERE verify_token_hash = $1 AND verify_expires_at > now()
       RETURNING id`,
      [hashToken(token)]
    )

    if (!rows.length) return res.redirect('/?verify=invalid')

    setSession(res, rows[0].id)
    res.redirect('/?verify=success')
  }))

  r.post('/resend', route(async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const { rows } = await db.query(
      `SELECT *, verify_sent_at > now() - make_interval(secs => $2) AS too_soon
       FROM public.users WHERE email = $1`,
      [email, RESEND_COOLDOWN_SECONDS]
    )
    const user = rows[0]

    if (user && !user.email_verified_at) {
      if (user.too_soon) {
        return res.status(429).json({
          error: 'Please wait a minute before requesting another email.',
        })
      }
      await issueVerification(db, req, user)
    }
    // Same response either way so this endpoint cannot be used to probe emails
    res.json({
      message: 'If that email has an unverified account, a new link is on its way.',
    })
  }))

  r.post('/login', route(async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const password = String(req.body?.password ?? '')

    const { rows } = await db.query(
      'SELECT * FROM public.users WHERE email = $1',
      [email]
    )
    const user = rows[0]
    const ok = await checkPassword(password, user?.password_hash ?? DUMMY_HASH)

    if (!user || !ok) {
      return res.status(401).json({ error: 'Incorrect email or password' })
    }
    if (!user.email_verified_at) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        needsVerification: true,
      })
    }

    setSession(res, user.id)
    res.json(publicUser(user))
  }))

  r.post('/logout', (_req, res) => {
    res.clearCookie(COOKIE, cookieOptions())
    res.status(204).end()
  })

  r.get('/me', requireAuth(db), (req, res) => {
    res.json(publicUser(req.user))
  })

  return r
}
