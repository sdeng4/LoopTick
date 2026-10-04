import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createCountdown,
  deleteCountdown,
  getMe,
  listCountdowns,
  logOut,
  updateCountdown,
} from './api.js'
import AuthModal from './AuthModal.jsx'
import CountdownForm from './CountdownForm.jsx'
import CountdownCard from './CountdownCard.jsx'
import { nextOccurrence } from './time.js'
import './App.css'

const VERIFY_MESSAGES = {
  success: { ok: true, text: 'Your email is verified. Welcome to LoopTick!' },
  invalid: { ok: false, text: 'That verification link is invalid or has expired. Log in to request a new one.' },
}

// Read once at startup, then strip ?verify=… from the address bar
function takeVerifyParam() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('verify')
  if (value) window.history.replaceState(null, '', window.location.pathname)
  return VERIFY_MESSAGES[value] ?? null
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = checking, null = logged out
  const [authMode, setAuthMode] = useState(null) // null | 'login' | 'signup'
  const [banner, setBanner] = useState(takeVerifyParam)
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

  useEffect(() => {
    getMe().then(setUser, () => setUser(null))
  }, [])

  const signedOut = useCallback(() => {
    setUser(null)
    setItems([])
    setEditing(null)
  }, [])

  // A 401 anywhere means the session ended; drop back to the logged-out view
  const guard = useCallback(async (fn) => {
    try {
      return await fn()
    } catch (e) {
      if (e.status === 401) signedOut()
      throw e
    }
  }, [signedOut])

  const load = useCallback(async () => {
    try {
      setItems(await guard(listCountdowns))
      setError('')
    } catch (e) {
      if (e.status !== 401) setError(`Unable to connect to the backend: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [guard])

  useEffect(() => {
    if (user) {
      setLoading(true)
      load()
    }
  }, [user, load])

  const handleSubmit = async (data) => {
    if (editing) {
      await guard(() => updateCountdown(editing.id, data))
      setEditing(null)
    } else {
      await guard(() => createCountdown(data))
    }
    await load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this countdown?')) return
    try {
      await guard(() => deleteCountdown(id))
    } catch (e) {
      if (e.status !== 401) setError(e.message)
      return
    }
    if (editing?.id === id) setEditing(null)
    await load()
  }

  const handleLogout = async () => {
    await logOut().catch(() => {})
    signedOut()
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
          {user ? (
            <div className="user">
              <span className="avatar">{user.username[0].toUpperCase()}</span>
              <span>{user.username}</span>
              <button className="btn-ghost" onClick={handleLogout}>Log out</button>
            </div>
          ) : user === null && (
            <div className="user">
              <button className="btn-ghost" onClick={() => setAuthMode('login')}>Log in</button>
              <button className="pro" onClick={() => setAuthMode('signup')}>Sign up</button>
            </div>
          )}
        </div>
      </header>

      {authMode && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setAuthMode(null)}
          onLoggedIn={(u) => {
            setAuthMode(null)
            setBanner(null)
            setUser(u)
          }}
        />
      )}

      <main className="main">
        {banner && (
          <div className="wrap">
            <div className={banner.ok ? 'notice banner' : 'error banner'}>
              <span>{banner.text}</span>
              <button className="icon-btn" onClick={() => setBanner(null)} title="dismiss">✕</button>
            </div>
          </div>
        )}

        {user === undefined && <div className="wrap"><p className="empty">Loading…</p></div>}

        {user === null && (
          <div className="wrap">
            <section className="hero">
              <div>
                <h2>Smart repeating countdowns</h2>
                <p>Create custom countdowns with daily, monthly, or yearly recurrence. Get an email the moment each one reaches its time.</p>
              </div>
              <div className="user">
                <button className="btn-ghost dark" onClick={() => setAuthMode('login')}>Log in</button>
                <button className="pro light" onClick={() => setAuthMode('signup')}>Create a free account</button>
              </div>
            </section>
          </div>
        )}

        {user && <div className="wrap layout">
          <div>
            <section className="hero">
              <div>
                <h2>Smart repeating countdowns</h2>
                <p>Create custom countdowns with daily, monthly, or yearly recurrence. They reset automatically, and we email you when each one ends.</p>
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
        </div>}
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
