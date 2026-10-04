import { useEffect, useState } from 'react'
import { logIn, resendVerification, signUp } from './api.js'

export default function AuthModal({ initialMode = 'login', onClose, onLoggedIn }) {
  const [mode, setMode] = useState(initialMode) // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setNotice('')
    setNeedsVerification(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    setNeedsVerification(false)

    try {
      if (mode === 'signup') {
        const { message } = await signUp({ email, username, password })
        setNotice(message)
        setNeedsVerification(true)
        setPassword('')
      } else {
        onLoggedIn(await logIn({ email, password }))
      }
    } catch (err) {
      setError(err.message)
      setNeedsVerification(err.needsVerification)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setBusy(true)
    setError('')
    try {
      const { message } = await resendVerification(email)
      setNotice(message)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="panel modal" onSubmit={submit}>
        <button type="button" className="icon-btn modal-close" onClick={onClose} title="close">✕</button>

        <div className="seg auth-tabs">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => switchMode('login')}>
            Log in
          </button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => switchMode('signup')}>
            Sign up
          </button>
        </div>

        <h3>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h3>
        <p className="sub">
          {mode === 'login'
            ? 'Log in to see and manage your countdowns.'
            : 'We will send a link to verify your email address.'}
        </p>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            autoFocus
          />
        </label>

        {mode === 'signup' && (
          <label className="field">
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="How should we call you?"
              autoComplete="username"
              minLength={2}
              maxLength={30}
              required
            />
          </label>
        )}

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={mode === 'signup' ? 8 : undefined}
            maxLength={128}
            required
          />
        </label>

        {error && <div className="error">{error}</div>}
        {notice && <div className="notice">{notice}</div>}

        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>

        {needsVerification && (
          <button type="button" className="btn outline" onClick={resend} disabled={busy || !email}>
            Resend verification email
          </button>
        )}
      </form>
    </div>
  )
}
