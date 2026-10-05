import { useMemo } from 'react'
import CountdownCard, { Unit } from './CountdownCard.jsx'
import CountdownForm from './CountdownForm.jsx'
import { breakdown, nextOccurrence, pad, repeatLabel } from './time.js'
import './Landing.css'

const FEATURES = [
  {
    icon: '⟳',
    title: 'Repeating loops',
    text: 'Choose one-time, daily, monthly, yearly, or a custom interval like every 2 months. Repeating countdowns restart on their own.',
  },
  {
    icon: '✉',
    title: 'Email reminders',
    text: 'When a countdown reaches zero, LoopTick emails the address on your account so you never miss it.',
  },
  {
    icon: '◷',
    title: 'Live to the second',
    text: 'Every card ticks down in days, hours, minutes, and seconds, updated in real time.',
  },
  {
    icon: '▦',
    title: 'Smart month ends',
    text: 'A monthly countdown set on the 31st moves to the last day of shorter months automatically.',
  },
  {
    icon: '◎',
    title: 'Timezone aware',
    text: 'Countdowns follow the timezone you created them in, so reminders arrive at the right local time.',
  },
  {
    icon: '⚿',
    title: 'Private to you',
    text: 'Every countdown belongs to your account. Only you can see, edit, or delete it.',
  },
]

const STEPS = [
  {
    title: 'Create your account',
    text: 'Sign up with your email, a username, and a password, then confirm the verification link we send you.',
  },
  {
    title: 'Set up a countdown',
    text: 'Add a title and optional notes, pick the target date and time, and choose how often it repeats.',
  },
  {
    title: 'Get notified on time',
    text: 'Watch it tick down on your dashboard. When it hits zero we email you, and repeating loops start again.',
  },
]

const FAQS = [
  {
    q: 'Which repeat options are available?',
    a: 'One-time, daily, monthly, and yearly, plus custom intervals: every N days, weeks, months, or years (for example every 2 months or every 2 years). One-time countdowns are marked as completed when they end; the others automatically roll over to their next occurrence.',
  },
  {
    q: 'How do email reminders work?',
    a: 'When a countdown reaches its target time, we send an email to the address on your account. For repeating countdowns you get an email every cycle.',
  },
  {
    q: 'What happens to a monthly countdown on the 31st?',
    a: 'In months without that date, it moves to the last day of the month, so it still fires once every month.',
  },
  {
    q: 'Why do I need to verify my email?',
    a: 'Each email address can only have one account, and verification makes sure your reminders reach a mailbox you actually own.',
  },
  {
    q: 'Can other people see my countdowns?',
    a: 'No. Countdowns are tied to your account and are only visible after you log in.',
  },
]

// Sample data for the previews; targets are derived from "now" so they always look live
function useSamples() {
  return useMemo(() => {
    const d = new Date(Date.now() + 14 * 86400_000)
    const launch = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`
    return [
      { id: 's1', title: 'Product launch', note: 'Final checks, publish the release notes, and share the announcement.', target: launch, repeat: 'none' },
      { id: 's2', title: 'Rent payment', note: 'Transfer rent before the due date. Restarts every month.', target: '2026-01-01T09:00', repeat: 'monthly' },
      { id: 's3', title: 'Morning workout', note: 'Thirty minutes before work, every single day.', target: '2026-01-01T07:00', repeat: 'daily' },
      { id: 's4', title: 'Car service', note: 'Oil change and tire check at the garage.', target: '2026-03-15T09:30', repeat: 'monthly', repeat_every: 2 },
    ]
  }, [])
}

function Check({ children }) {
  return <span className="lp-check"><i>✓</i>{children}</span>
}

export default function Landing({ now, banner, onLogin, onSignup }) {
  const samples = useSamples()
  const hero = samples[3]
  const next = nextOccurrence(hero.target, hero.repeat, now, hero.repeat_every)
  const { days, hours, minutes, seconds } = breakdown(next - now)

  const stats = {
    active: samples.filter((s) => nextOccurrence(s.target, s.repeat, now, s.repeat_every)).length,
    loops: samples.filter((s) => s.repeat !== 'none').length,
  }

  return (
    <div className="shell lp">
      <header className="topbar lp-top">
        <div className="wrap">
          <div className="brand">
            <img className="logo-img" src="/logo.png" alt="" />
            LoopTick
          </div>
          <nav className="nav">
            <a href="#features">Features</a>
            <a href="#preview">Dashboard</a>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="user">
            <button className="btn-ghost" onClick={onLogin}>Log in</button>
            <button className="pro" onClick={onSignup}>Sign up →</button>
          </div>
        </div>
      </header>

      <main>
        {banner && <div className="lp-banner">{banner}</div>}

        {/* hero */}
        <section className="lp-hero">
          <div className="wrap lp-hero-grid">
            <div>
              <span className="lp-pill">● Repeating countdowns with email reminders</span>
              <h1>
                Smart repeating countdowns, <em>so every cycle lands on time.</em>
              </h1>
              <p className="lp-lead">
                Track one-time, daily, monthly, and yearly moments, or set your own interval. Each countdown restarts
                itself when it ends and emails you the moment it hits zero.
              </p>
              <div className="lp-actions">
                <button className="lp-btn primary" onClick={onSignup}>Create your first Tick →</button>
                <a className="lp-btn outline" href="#how">See how it works ▷</a>
              </div>
              <div className="lp-checks">
                <Check>Email-verified accounts</Check>
                <Check>Private to you</Check>
                <Check>Ready in a minute</Check>
              </div>
            </div>

            <div className="lp-showcase">
              <div className="lp-show-head">
                <div>
                  <b>Your next loop</b>
                  <small>Live countdown, updated every second</small>
                </div>
                <span className="lp-live">● Live</span>
              </div>

              <article className="card lp-show-card">
                <div className="card-top">
                  <span className={`badge ${hero.repeat}`}>⟳ {repeatLabel(hero.repeat, hero.repeat_every)}</span>
                  <span className="status">Active</span>
                </div>
                <h4>{hero.title}</h4>
                <p className="note">{hero.note}</p>
                <div className="time">
                  <Unit value={pad(days)} label="DAYS" />
                  <Unit value={pad(hours)} label="HRS" />
                  <Unit value={pad(minutes)} label="MINS" />
                  <Unit value={pad(seconds)} label="SECS" />
                </div>
                <div className="card-foot">
                  <span>▦ {next.toLocaleString('sv-SE').slice(0, 16)}</span>
                  <span>✉ Email reminder on</span>
                </div>
              </article>

              <div className="lp-tiles">
                <div><b>N×</b><small>Custom intervals</small></div>
                <div><b>1s</b><small>Live refresh</small></div>
                <div><b>✉</b><small>Email at zero</small></div>
              </div>
            </div>
          </div>
        </section>

        {/* dashboard preview */}
        <section className="lp-section" id="preview">
          <div className="wrap">
            <div className="lp-head">
              <span className="lp-pill">Dashboard</span>
              <h2>One dashboard for every recurring moment</h2>
              <p>Create, edit, and watch all of your countdowns in one clean view, with recurrence rules right next to them.</p>
            </div>

            <div className="lp-frame">
              <div className="lp-frame-bar">
                <span className="dots"><i /><i /><i /></span>
                <span className="lp-frame-title">LoopTick · Dashboard</span>
                <span />
              </div>
              <div className="layout lp-frame-body">
                <div>
                  <section className="hero">
                    <div>
                      <h2>Smart repeating countdowns</h2>
                      <p>They reset automatically, and we email you when each one ends.</p>
                    </div>
                    <div className="stats">
                      <div><b>{stats.active}</b><small>Active</small></div>
                      <div><b>{stats.loops}</b><small>Repeating</small></div>
                      <div><b>{samples.length - stats.active}</b><small>Completed</small></div>
                    </div>
                  </section>

                  <div className="section-head">
                    <h3>Active Countdowns <span className="count">{samples.length}</span></h3>
                    <button className="pro" onClick={onSignup}>+ New Tick</button>
                  </div>

                  <div className="grid">
                    {samples.map((item) => (
                      <CountdownCard key={item.id} item={item} now={now} onEdit={onSignup} onDelete={onSignup} />
                    ))}
                  </div>
                </div>

                <CountdownForm now={now} onSubmit={async () => onSignup()} onCancel={() => {}} />
              </div>
            </div>
          </div>
        </section>

        {/* features */}
        <section className="lp-section alt" id="features">
          <div className="wrap">
            <div className="lp-head">
              <span className="lp-pill">Features</span>
              <h2>Everything a countdown needs, nothing it doesn't</h2>
              <p>LoopTick keeps the essentials simple and reliable.</p>
            </div>
            <div className="lp-features">
              {FEATURES.map((f) => (
                <div className="lp-feature" key={f.title}>
                  <span className="lp-icon">{f.icon}</span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* how it works */}
        <section className="lp-section" id="how">
          <div className="wrap">
            <div className="lp-head">
              <span className="lp-pill">How it works</span>
              <h2>Up and running in three steps</h2>
            </div>
            <ol className="lp-steps">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="lp-step-no">{pad(i + 1)}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* faq */}
        <section className="lp-section alt" id="faq">
          <div className="wrap lp-faq-wrap">
            <div className="lp-head">
              <span className="lp-pill">FAQ</span>
              <h2>Frequently asked questions</h2>
            </div>
            <div className="lp-faq">
              {FAQS.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* call to action */}
        <section className="lp-section">
          <div className="wrap">
            <div className="lp-cta">
              <div>
                <h2>Start your first loop today</h2>
                <p>Create an account, verify your email, and set your first countdown in under a minute.</p>
              </div>
              <div className="user">
                <button className="btn-ghost dark" onClick={onLogin}>Log in</button>
                <button className="pro light" onClick={onSignup}>Sign up →</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <span>© 2026 LoopTick</span>
        <span className="links"><span>Terms</span><span>Privacy</span></span>
        <span>Clean Utility System · <span className="mono">Built with React</span></span>
      </div>
    </footer>
  )
}
