import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createCountdown,
  deleteCountdown,
  listCountdowns,
  updateCountdown,
} from './api.js'
import CountdownForm from './CountdownForm.jsx'
import CountdownCard from './CountdownCard.jsx'
import { nextOccurrence } from './time.js'
import './App.css'

export default function App() {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null) // countdown being edited
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())
  const [filter, setFilter] = useState('all') // 'all' | 'loops'

  // One shared ticker drives every card
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    try {
      setItems(await listCountdowns())
      setError('')
    } catch (e) {
      setError(`Unable to connect to the backend: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (data) => {
    if (editing) {
      await updateCountdown(editing.id, data)
      setEditing(null)
    } else {
      await createCountdown(data)
    }
    await load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this countdown?')) return
    await deleteCountdown(id)
    if (editing?.id === id) setEditing(null)
    await load()
  }

  const stats = useMemo(() => {
    const active = items.filter((i) => nextOccurrence(i.target, i.repeat, now) !== null).length
    const loops = items.filter((i) => i.repeat !== 'none').length
    return { active, loops, done: items.length - active }
  }, [items, now])

  const visible = filter === 'loops' ? items.filter((i) => i.repeat !== 'none') : items

  const focusForm = () => {
    document.getElementById('config')?.scrollIntoView({ behavior: 'smooth' })
    document.querySelector('#config input')?.focus()
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="wrap">
          <div className="brand">
            <span className="logo">⟳</span>
            LoopTick
          </div>
        </div>
      </header>

      <main className="main">
        <div className="wrap layout">
          <div>
            <section className="hero">
              <div>
                <h2>Smart repeating countdowns</h2>
                <p>Create custom countdowns with daily, monthly, or yearly recurrence. They reset automatically when the timer ends.</p>
              </div>
              <div className="stats">
                <div><b>{stats.active}</b><small>Active</small></div>
                <div><b>{stats.loops}</b><small>Repeating</small></div>
                <div><b>{stats.done}</b><small>Completed</small></div>
              </div>
            </section>

            <div className="section-head">
              <h3>Active Countdowns <span className="count">{items.length}</span></h3>
              <div className="filters">
                <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All</button>
                <button className={filter === 'loops' ? 'on' : ''} onClick={() => setFilter('loops')}>⟳ Repeating Only</button>
              </div>
            </div>

            {error && <div className="error">{error}</div>}
            {loading && <p className="empty">Loading…</p>}

            <div className="grid">
              {visible.map((item) => (
                <CountdownCard
                  key={item.id}
                  item={item}
                  now={now}
                  onEdit={() => {
                    setEditing(item)
                    focusForm()
                  }}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
              <button className="new-card" onClick={() => { setEditing(null); focusForm() }}>
                <span className="plus">+</span>
                <b>Create Countdown</b>
                <span>Use the configuration panel on the right to quickly create a custom countdown.</span>
              </button>
            </div>
          </div>

          <CountdownForm
            key={editing?.id ?? 'new'}
            initial={editing}
            now={now}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </div>
      </main>

      <footer className="footer">
        <div className="wrap">
          <span>© 2026 LoopTick</span>
          <span className="links"><span>Terms</span><span>Privacy</span></span>
          <span>Clean Utility System · <span className="mono">Built with React</span></span>
        </div>
      </footer>
    </div>
  )
}
