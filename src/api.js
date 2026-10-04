async function request(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.error || `Request failed (${res.status})`)
    err.status = res.status
    err.needsVerification = !!body.needsVerification
    throw err
  }
  return res.status === 204 ? null : res.json()
}

const post = (url, data) =>
  request(url, { method: 'POST', body: JSON.stringify(data ?? {}) })

// Sent with every countdown so the server knows when it fires in the user's local time
const withTimezone = (data) => ({
  ...data,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
})

export const getMe = () => request('/api/auth/me')
export const signUp = (data) => post('/api/auth/signup', data)
export const logIn = (data) => post('/api/auth/login', data)
export const logOut = () => post('/api/auth/logout')
export const resendVerification = (email) => post('/api/auth/resend', { email })

export const listCountdowns = () => request('/api/countdowns')
export const createCountdown = (data) =>
  post('/api/countdowns', withTimezone(data))
export const updateCountdown = (id, data) =>
  request(`/api/countdowns/${id}`, { method: 'PUT', body: JSON.stringify(withTimezone(data)) })
export const deleteCountdown = (id) =>
  request(`/api/countdowns/${id}`, { method: 'DELETE' })
