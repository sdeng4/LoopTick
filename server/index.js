import express from 'express'
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new DatabaseSync(path.join(__dirname, 'looptick.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS countdowns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    target TEXT NOT NULL,            -- local time, "YYYY-MM-DDTHH:mm"
    repeat TEXT NOT NULL DEFAULT 'none' CHECK (repeat IN ('none','daily','monthly','yearly')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

const app = express()
app.use(express.json())

const REPEATS = ['none', 'daily', 'monthly', 'yearly']
const TARGET_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

function parse(body) {
  const title = String(body.title ?? '').trim()
  const note = String(body.note ?? '').trim()
  const target = String(body.target ?? '')
  const repeat = String(body.repeat ?? 'none')
  if (!title) return { error: 'title is required' }
  if (!TARGET_RE.test(target)) return { error: 'target must be YYYY-MM-DDTHH:mm' }
  if (!REPEATS.includes(repeat)) return { error: 'invalid repeat' }
  return { value: { title, note, target, repeat } }
}

app.get('/api/countdowns', (_req, res) => {
  res.json(db.prepare('SELECT * FROM countdowns ORDER BY id DESC').all())
})

app.post('/api/countdowns', (req, res) => {
  const { error, value } = parse(req.body)
  if (error) return res.status(400).json({ error })
  const info = db
    .prepare('INSERT INTO countdowns (title, note, target, repeat) VALUES (?, ?, ?, ?)')
    .run(value.title, value.note, value.target, value.repeat)
  res.status(201).json(db.prepare('SELECT * FROM countdowns WHERE id = ?').get(info.lastInsertRowid))
})

app.put('/api/countdowns/:id', (req, res) => {
  const { error, value } = parse(req.body)
  if (error) return res.status(400).json({ error })
  const info = db
    .prepare('UPDATE countdowns SET title = ?, note = ?, target = ?, repeat = ? WHERE id = ?')
    .run(value.title, value.note, value.target, value.repeat, req.params.id)
  if (!info.changes) return res.status(404).json({ error: 'not found' })
  res.json(db.prepare('SELECT * FROM countdowns WHERE id = ?').get(req.params.id))
})

app.delete('/api/countdowns/:id', (req, res) => {
  const info = db.prepare('DELETE FROM countdowns WHERE id = ?').run(req.params.id)
  if (!info.changes) return res.status(404).json({ error: 'not found' })
  res.status(204).end()
})

// Serve the built frontend when running `npm start`
const dist = path.join(__dirname, '..', 'dist')
app.use(express.static(dist))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(dist, 'index.html'), (err) => err && next())
})

const port = process.env.API_PORT || 3001
app.listen(port, () => console.log(`LoopTick API on http://localhost:${port}`))
