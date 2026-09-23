async function request(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return res.status === 204 ? null : res.json()
}

export const listCountdowns = () => request('/api/countdowns')
export const createCountdown = (data) =>
  request('/api/countdowns', { method: 'POST', body: JSON.stringify(data) })
export const updateCountdown = (id, data) =>
  request(`/api/countdowns/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteCountdown = (id) =>
  request(`/api/countdowns/${id}`, { method: 'DELETE' })
