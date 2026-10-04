import express from 'express'
import pg from 'pg'
import dotenv from 'dotenv'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { authRouter, requireAuth, appUrl } from './auth.js'
import { isValidTimezone, nextFireAt } from './tz.js'
import { sendDueNotifications } from './notify.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing from server/.env')
}

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(path.join(__dirname, 'supabase-ca.crt'), 'utf8'),
  },
  max: 5,
  connectionTimeoutMillis: 10000,
})

db.on('error', (err) => {
  console.error('Database pool error:', err.message)
})

const app = express()
app.set('trust proxy', 1)
app.use(express.json())

const REPEATS = ['none', 'daily', 'monthly', 'yearly']
const TARGET_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
const COUNTDOWN_COLUMNS = 'id, title, note, target, repeat, timezone, created_at'

function parse(body = {}) {
  const title = String(body.title ?? '').trim()
  const note = String(body.note ?? '').trim()
  const target = String(body.target ?? '')
  const repeat = String(body.repeat ?? 'none')
  const timezone = String(body.timezone ?? 'UTC')

  if (!title) return { error: 'title is required' }
  if (!TARGET_RE.test(target)) {
    return { error: 'target must be YYYY-MM-DDTHH:mm' }
  }
  if (!REPEATS.includes(repeat)) {
    return { error: 'invalid repeat' }
  }
  if (!isValidTimezone(timezone)) {
    return { error: 'invalid timezone' }
  }

  const notifyAt = nextFireAt(target, repeat, timezone)
  return { value: { title, note, target, repeat, timezone, notifyAt } }
}

const route = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next)
}

app.param('id', (req, res, next, id) => {
  if (!/^[1-9]\d*$/.test(id) ||
      !Number.isSafeInteger(Number(id))) {
    return res.status(400).json({ error: 'invalid id' })
  }
  next()
})

app.use('/api/auth', authRouter(db, route))

// On Vercel there is no always-on process, so an external scheduler calls this
// every minute with "Authorization: Bearer <CRON_SECRET>".
app.all('/api/cron/notify', route(async (req, res) => {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  const given = String(req.headers.authorization ?? '')
  if (!process.env.CRON_SECRET || given.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const sent = await sendDueNotifications(db, appUrl(req))
  res.json({ sent })
}))

// Every countdown route below only touches the logged-in user's own rows
app.use('/api/countdowns', requireAuth(db))

app.get('/api/countdowns', route(async (req, res) => {
  const { rows } = await db.query(
    `SELECT ${COUNTDOWN_COLUMNS} FROM public.countdowns
     WHERE user_id = $1 ORDER BY id DESC`,
    [req.user.id]
  )
  res.json(rows)
}))

app.post('/api/countdowns', route(async (req, res) => {
  const { error, value } = parse(req.body)
  if (error) return res.status(400).json({ error })

  const { rows } = await db.query(
    `INSERT INTO public.countdowns
       (user_id, title, note, target, repeat, timezone, notify_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COUNTDOWN_COLUMNS}`,
    [
      req.user.id, value.title, value.note, value.target,
      value.repeat, value.timezone, value.notifyAt,
    ]
  )
  res.status(201).json(rows[0])
}))

app.put('/api/countdowns/:id', route(async (req, res) => {
  const { error, value } = parse(req.body)
  if (error) return res.status(400).json({ error })

  const { rows } = await db.query(
    `UPDATE public.countdowns
     SET title = $1, note = $2, target = $3, repeat = $4,
         timezone = $5, notify_at = $6
     WHERE id = $7 AND user_id = $8
     RETURNING ${COUNTDOWN_COLUMNS}`,
    [
      value.title, value.note, value.target, value.repeat,
      value.timezone, value.notifyAt, req.params.id, req.user.id,
    ]
  )

  if (!rows.length) {
    return res.status(404).json({ error: 'not found' })
  }
  res.json(rows[0])
}))

app.delete('/api/countdowns/:id', route(async (req, res) => {
  const { rowCount } = await db.query(
    'DELETE FROM public.countdowns WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  )

  if (!rowCount) {
    return res.status(404).json({ error: 'not found' })
  }
  res.status(204).end()
}))

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found' })
})

const dist = path.join(__dirname, '..', 'dist')
app.use(express.static(dist))

app.use((req, res, next) => {
  if (req.method !== 'GET') return next()
  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err) next(err)
  })
})

app.use((err, _req, res, _next) => {
  console.error('Request failed:', err.message)
  const status = err.status === 400 ? 400 : 500
  res.status(status).json({
    error: status === 400 ? 'Invalid request' : 'Server error',
  })
})

async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.users (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified_at TIMESTAMPTZ,
      verify_token_hash TEXT,
      verify_expires_at TIMESTAMPTZ,
      verify_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS public.countdowns (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      target TEXT NOT NULL,
      repeat TEXT NOT NULL DEFAULT 'none'
        CHECK (repeat IN ('none','daily','monthly','yearly')),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
    )
  `)

  await db.query(`
    ALTER TABLE public.countdowns
      ADD COLUMN IF NOT EXISTS user_id INTEGER
        REFERENCES public.users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
      ADD COLUMN IF NOT EXISTS notify_at TIMESTAMPTZ
  `)
  await db.query(`
    CREATE INDEX IF NOT EXISTS countdowns_user_id_idx
      ON public.countdowns (user_id)
  `)
  await db.query(`
    CREATE INDEX IF NOT EXISTS countdowns_notify_at_idx
      ON public.countdowns (notify_at) WHERE notify_at IS NOT NULL
  `)

  for (const table of ['users', 'countdowns']) {
    await db.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`)
    await db.query(
      `REVOKE ALL ON TABLE public.${table} FROM anon, authenticated`
    )
  }
}

async function start() {
  await migrate()

  const port = process.env.API_PORT || 3001
  app.listen(port, () => {
    console.log(`LoopTick API on http://localhost:${port}`)
    console.log('Connected to Supabase PostgreSQL')
  })

  // Long-running server: check for due countdowns every 30 seconds
  const url = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '')
  setInterval(() => {
    sendDueNotifications(db, url).catch((err) => {
      console.error('Notification run failed:', err.message)
    })
  }, 30_000)
}

if (!process.env.VERCEL) {
  start().catch(async (err) => {
    console.error('Startup failed:', err.message)
    await db.end()
    process.exitCode = 1
  })
}

export default app
