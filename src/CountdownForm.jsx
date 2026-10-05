import { useState } from 'react'
import {
  breakdown,
  nextOccurrence,
  nowLocalInput,
  pad,
  repeatLabel,
} from './time.js'
import { Unit } from './CountdownCard.jsx'

const REPEAT_OPTIONS = [
  { value: 'none', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

const CUSTOM_UNITS = [
  { value: 'daily', label: 'days' },
  { value: 'weekly', label: 'weeks' },
  { value: 'monthly', label: 'months' },
  { value: 'yearly', label: 'years' },
]

const MAX_EVERY = 999

// Anything that is not one of the four presets is shown as a custom interval
const isCustom = (item) =>
  !!item && item.repeat !== 'none' &&
  ((item.repeat_every ?? 1) !== 1 || item.repeat === 'weekly')

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
  const [custom, setCustom] = useState(() => isCustom(initial))
  const [every, setEvery] = useState(String(initial?.repeat_every ?? 2))
  const [showPreview, setShowPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const target = `${date}T${time}`
  const everyNum = custom ? Number(every) : 1
  const everyValid = Number.isInteger(everyNum) && everyNum >= 1 && everyNum <= MAX_EVERY

  const pickPreset = (value) => {
    setCustom(false)
    setRepeat(value)
  }

  const pickCustom = () => {
    setCustom(true)
    if (repeat === 'none') setRepeat('monthly')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!everyValid) {
      setError(`Repeat interval must be a whole number from 1 to ${MAX_EVERY}.`)
      return
    }
    setBusy(true)
    setError('')

    try {
      await onSubmit({ title, note, target, repeat, repeat_every: everyNum })

      if (!initial) {
        const [d, t] = nowLocalInput().split('T')
        setTitle('')
        setNote('')
        setRepeat('none')
        setCustom(false)
        setEvery('2')
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
    date && time && everyValid ? nextOccurrence(target, repeat, now, everyNum) : null
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
            className={!custom && repeat === option.value ? 'on' : ''}
            onClick={() => pickPreset(option.value)}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          className={`seg-wide${custom ? ' on' : ''}`}
          onClick={pickCustom}
        >
          ⚙ Custom interval
        </button>
      </div>

      {custom && (
        <div className="custom-every">
          <span>Every</span>
          <input
            type="number"
            min={1}
            max={MAX_EVERY}
            step={1}
            value={every}
            onChange={(e) => setEvery(e.target.value)}
            aria-label="Repeat interval"
            required
          />
          <select
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            aria-label="Repeat unit"
          >
            {CUSTOM_UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          <div className="custom-quick">
            {[[2, 'monthly', '2 months'], [3, 'monthly', '3 months'], [6, 'monthly', '6 months'], [2, 'yearly', '2 years']].map(([n, unit, label]) => (
              <button
                type="button"
                key={label}
                className={everyNum === n && repeat === unit ? 'on' : ''}
                onClick={() => { setEvery(String(n)); setRepeat(unit) }}
              >
                {label}
              </button>
            ))}
          </div>
          <small className="custom-next">
            {next
              ? `Next: ${next.toLocaleString('sv-SE').slice(0, 16)} · ${repeatLabel(repeat, everyNum)}`
              : 'Enter a number from 1 to 999.'}
          </small>
        </div>
      )}

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