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
      setError(`无法连接后端：${e.message}`)
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
    if (!confirm('确定删除这个倒计时吗？')) return
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
            LoopTick <span className="ver">v1.2</span>
          </div>
          <nav className="nav">
            <a className="on" href="#">Dashboard</a>
            <a href="#">Templates</a>
            <a href="#">History</a>
            <a href="#">Settings</a>
          </nav>
          <div className="user">
            <button className="pro">Go Pro</button>
            <span className="avatar">A</span>
            alex.dev
          </div>
        </div>
      </header>

      <main className="main">
        <div className="wrap layout">
          <div>
            <section className="hero">
              <div>
                <h2>Smart repeating countdowns for productive teams.</h2>
                <p>自定义倒计时，支持每日 / 每月 / 每年循环，到点自动重置，无需手动重来。</p>
              </div>
              <div className="stats">
                <div><b>{stats.active}</b><small>进行中</small></div>
                <div><b>{stats.loops}</b><small>循环倒计时</small></div>
                <div><b>{stats.done}</b><small>已结束</small></div>
              </div>
            </section>

            <div className="section-head">
              <h3>Active Countdowns <span className="count">{items.length}</span></h3>
              <div className="filters">
                <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>全部</button>
                <button className={filter === 'loops' ? 'on' : ''} onClick={() => setFilter('loops')}>⟳ 仅循环</button>
              </div>
            </div>

            {error && <div className="error">{error}</div>}
            {loading && <p className="empty">加载中…</p>}

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
                <b>新建倒计时</b>
                <span>通过右侧配置面板快速创建自定义倒计时。</span>
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
