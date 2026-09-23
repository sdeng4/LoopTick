import { useState } from 'react'
import { breakdown, nextOccurrence, nowLocalInput, pad } from './time.js'
import { Unit } from './CountdownCard.jsx'

const REPEAT_OPTIONS = [
  { value: 'none', label: '单次' },
  { value: 'daily', label: '每天' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
]

export default function CountdownForm({ initial, now, onSubmit, onCancel }) {
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

  const next = date && time ? nextOccurrence(target, repeat, now) : null
  const parts = next ? breakdown(next - now) : null

  return (
    <form className="panel" id="config" onSubmit={submit}>
      <h3>{initial ? '编辑倒计时' : '新建倒计时'}</h3>
      <p className="sub">设置倒计时目标和循环规则。</p>

      <div className="preview">
        {showPreview && parts ? (
          <div className="time">
            <Unit value={pad(parts.days)} label="DAYS" />
            <Unit value={pad(parts.hours)} label="HRS" />
            <Unit value={pad(parts.minutes)} label="MINS" />
            <Unit value={pad(parts.seconds)} label="SECS" />
          </div>
        ) : (
          <div className="placeholder">
            {showPreview ? '目标时间已过' : '点击下方“实时预览”'}
          </div>
        )}
      </div>

      <label className="field">
        <span>标题</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：生日、交房租、考试"
          maxLength={60}
          required
        />
      </label>

      <label className="field">
        <span>内容备注</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="可选：想写点什么都行"
          rows={3}
          maxLength={300}
        />
      </label>

      <div className="row">
        <label className="field">
          <span>目标日期</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field">
          <span>目标时间</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
      </div>

      <div className="field"><span>循环频率</span></div>
      <div className="seg">
        {REPEAT_OPTIONS.map((o) => (
          <button
            type="button"
            key={o.value}
            className={repeat === o.value ? 'on' : ''}
            onClick={() => setRepeat(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      <button type="submit" className="btn primary" disabled={busy}>
        {initial ? '保存修改' : '创建倒计时'}
      </button>
      <button type="button" className="btn outline" onClick={() => setShowPreview((v) => !v)}>
        👁 实时预览
      </button>
      {initial && (
        <button type="button" className="btn outline" onClick={onCancel}>
          取消编辑
        </button>
      )}

      <div className="tip">
        <span>✦</span>
        <span>提示：每月循环遇到没有该日期的月份（如 31 号）时，会自动顺延到该月最后一天。</span>
      </div>
    </form>
  )
}
