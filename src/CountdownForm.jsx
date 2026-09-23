import { useState } from 'react'
import {
  breakdown,
  nextOccurrence,
  nowLocalInput,
  pad,
} from './time.js'
import { Unit } from './CountdownCard.jsx'

const REPEAT_OPTIONS = [
  { value: 'none', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export default function CountdownForm({
  initial,
  now,
  onSubmit,
  onCancel,
}) {
  const start = (initial?.target ?? nowLocalInput()).split('T')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [date, setDate] = useState(start[0])
  const [time, setTime] = useState(start[1])
  const [repeat, setRepeat] = useState(initial?.repeat ?? 'none')
  const [showPreview, setShowPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const target = `${date}T${time}`

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      await onSubmit({ title, note, target, repeat })

      if (!initial) {
        const [d, t] = nowLocalInput().split('T')
        setTitle('')
        setNote('')
        setRepeat('none')
        setDate(d)
        setTime(t)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const next =
    date && time ? nextOccurrence(target, repeat, now) : null
  const parts = next ? breakdown(next - now) : null

  return (
    <form className="panel" id="config" onSubmit={submit}>
      <h3>{initial ? 'Edit Countdown' : 'Create Countdown'}</h3>
      <p className="sub">
        Set the countdown target and recurrence rules.
      </p>



      <label className="field">
        <span>Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="For example: Birthday, rent, or exam"
          maxLength={60}
          required
        />
      </label>

      <label className="field">
        <span>Notes</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional: Add any details you want"
          rows={3}
          maxLength={300}
        />
      </label>

      <div className="row">
        <label className="field">
          <span>Target Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Target Time</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="field">
        <span>Repeat Frequency</span>
      </div>

      <div className="seg">
        {REPEAT_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.value}
            className={repeat === option.value ? 'on' : ''}
            onClick={() => setRepeat(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      <button
        type="submit"
        className="btn primary"
        disabled={busy}
      >
        {initial ? 'Save Changes' : 'Create Countdown'}
      </button>

      {initial && (
        <button
          type="button"
          className="btn outline"
          onClick={onCancel}
        >
          Cancel Editing
        </button>
      )}

      <div className="tip">
        <span>✦</span>
        <span>
          Tip: If a monthly countdown falls on a date that does not
          exist in a particular month, such as the 31st, it will
          automatically move to the last day of that month.
        </span>
      </div>
    </form>
  )
}