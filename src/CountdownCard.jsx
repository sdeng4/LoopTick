import { breakdown, nextOccurrence, pad } from './time.js'

export const REPEAT_LABEL = { none: '单次', daily: '每天', monthly: '每月', yearly: '每年' }

export default function CountdownCard({ item, now, onEdit, onDelete }) {
  const next = nextOccurrence(item.target, item.repeat, now)
  const finished = next === null
  const { days, hours, minutes, seconds } = breakdown(finished ? 0 : next - now)
  const stamp = (next ?? new Date(item.target)).toLocaleString('sv-SE').slice(0, 16)

  return (
    <article className={`card${finished ? ' done' : ''}`}>
      <div className="card-top">
        <span className={`badge ${item.repeat}`}>
          {item.repeat !== 'none' && '⟳ '}
          {REPEAT_LABEL[item.repeat]}
        </span>
        <span className="status">{finished ? '已结束' : '进行中'}</span>
      </div>

      <h4>{item.title}</h4>
      <p className="note">{item.note}</p>

      {finished ? (
        <div className="finished">已结束</div>
      ) : (
        <div className="time">
          <Unit value={pad(days)} label="DAYS" />
          <Unit value={pad(hours)} label="HRS" />
          <Unit value={pad(minutes)} label="MINS" />
          <Unit value={pad(seconds)} label="SECS" />
        </div>
      )}

      <div className="card-foot">
        <span>▦ {stamp}</span>
        <span className="buttons">
          <button className="icon-btn" onClick={onEdit} title="编辑">✎</button>
          <button className="icon-btn danger" onClick={onDelete} title="删除">✕</button>
        </span>
      </div>
    </article>
  )
}

export function Unit({ value, label }) {
  return (
    <div className="unit">
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  )
}
