import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore'
import { usePractice } from './data/practice.js'
import { onAuthStateChanged } from 'firebase/auth'
import { acts } from './data/script.js'
import { schedule } from './data/schedule.js'
import { auth, db, configured } from './data/firebase.js'
import './admin.css'

// 막 선택지: 1~4막 + 점심시간
const kinds = acts.map((a) => ({ id: String(a.id), title: a.title }))
export const kindLabel = (id) => (id === 'lunch' ? '점심시간' : kinds.find((k) => k.id === String(id))?.title || String(id))

// 연습 타임 (점심 12:00~13:00 은 고정이라 선택지에 없고, 시간표에 자동으로 끼워 넣습니다.)
const blocks = [
  { start: '10:00', end: '12:00' },
  { start: '13:00', end: '14:30' },
  { start: '14:30', end: '16:00' },
  { start: '16:00', end: '18:00' },
]
const LUNCH = { id: 'lunch', act: 'lunch', start: '12:00', end: '13:00' }
// 시간표 목록: 그날 신청이 하나라도 있으면 점심시간을 12시 자리에 넣어 보여 줍니다.
const withLunch = (list) => (list.length ? [...list, LUNCH].sort((a, b) => a.start.localeCompare(b.start)) : list)

// 연습 날짜 = 일정 중 '공연' 이 아닌 날
const days = schedule.filter((s) => !s.title.includes('공연')).map((s) => s.date)
export const fmtDay = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return `${m}.${d} (${'일월화수목금토'[new Date(y, m - 1, d).getDay()]})`
}
export const hm = (t) => t.replace(/^0/, '')

/** 한 날짜의 시간표 (읽기 전용 목록). onDel 이 있으면 삭제 버튼도 보입니다. */
export function SlotList({ slots, onDel }) {
  slots = withLunch(slots)
  if (!slots.length) return <p className="pr-none">아직 정해진 시간표가 없습니다.</p>
  return (
    <ul className="pr-list">
      {slots.map((s) => (
        <li key={s.id} className={s.act === 'lunch' ? 'lunch' : ''}>
          <span className="pr-time">{hm(s.start)}~{hm(s.end)}</span>
          <b>{kindLabel(s.act)}</b>
          {onDel && s.id !== 'lunch' && <button onClick={() => onDel(s)} aria-label="삭제">✕</button>}
        </li>
      ))}
    </ul>
  )
}

// /practice : 각 막의 팀장이 날짜·시간·막을 골라 연습 시간을 신청하는 화면 (로그인 필요). 목록은 누구나 볼 수 있습니다.
export default function Practice() {
  const slots = usePractice()
  const [user, setUser] = useState(null)
  const [msg, setMsg] = useState('')
  const [date, setDate] = useState(() => days.find((d) => d >= new Date().toLocaleDateString('sv')) || days[0])
  const [act, setAct] = useState(kinds[0].id)
  const [blk, setBlk] = useState(0)
  const { start, end } = blocks[blk]

  useEffect(() => (configured ? onAuthStateChanged(auth, (u) => { setUser(u) }) : undefined), [])

  // 일반 신청자는 '이번 주 + 다음 주' 연습일만, 로그인한 관리자는 모든 날짜를 신청할 수 있습니다.
  const todayStr = new Date().toLocaleDateString('sv')
  const lastOk = (() => {
    const t = new Date(); t.setDate(t.getDate() + ((6 - t.getDay() + 7) % 7) + 7) // 이번 주 토요일 + 7일
    return t.toLocaleDateString('sv')
  })()
  const choices = user ? days : days.filter((d) => d >= todayStr && d <= lastOk)
  useEffect(() => { if (choices.length && !choices.includes(date)) setDate(choices[0]) }, [choices.join(), date]) // eslint-disable-line
  const ofDay = (d) => (slots || []).filter((s) => s.date === d)
  const pickDay = (d) => setDate(d)
  // 이미 신청된 (날짜·막·타임) 은 선택할 수 없게 막습니다.
  const taken = (i) => ofDay(date).some((x) => String(x.act) === act && x.start === blocks[i].start)
  const freeIdx = blocks.findIndex((_, i) => !taken(i))
  useEffect(() => { if (taken(blk) && freeIdx >= 0) setBlk(freeIdx) }, [slots, date, act]) // eslint-disable-line
  const overlap = ofDay(date).find((s) => start < s.end && end > s.start)

  const submit = async (e) => {
    e.preventDefault()
    setMsg('저장 중…')
    try {
      await addDoc(collection(db, 'practice'), { date, act, start, end, createdAt: Date.now() })
      setMsg('신청되었습니다.')
      setBlk((blk + 1) % blocks.length)
    } catch (x) { setMsg(`저장 실패: ${x.code || x.message}`) }
  }
  const del = (s) => {
    if (!confirm(`${fmtDay(s.date)} ${hm(s.start)}~${hm(s.end)} ${kindLabel(s.act)} 을(를) 삭제할까요?`)) return
    deleteDoc(doc(db, 'practice', s.id)).then(() => setMsg('삭제됨')).catch((x) => setMsg(`삭제 실패: ${x.code || x.message}`))
  }

  return (
    <div className="adm pub">
      <header className="adm-top">
        <h1>연습 시간 신청</h1>
        <div><a href="/">← 메인으로</a></div>
      </header>
      <p className="pr-help">날짜·시간·막을 골라 신청하세요. 누구나 신청할 수 있습니다.</p>

      {msg && <p className="adm-status">{msg}</p>}

      {(
        <form className="adm-form pr-form" onSubmit={submit}>
          <label>날짜{!user && <small> (이번 주·다음 주만 신청 가능)</small>}
            <select value={date} onChange={(e) => pickDay(e.target.value)}>
              {choices.map((d) => <option key={d} value={d}>{fmtDay(d)}</option>)}
            </select>
          </label>
          <div className="pr-field">막
            <div className="pr-btns">
              {kinds.map((k) => <button type="button" key={k.id} className={k.id === act ? 'on' : ''} onClick={() => setAct(k.id)}>{k.title}</button>)}
            </div>
          </div>
          <div className="pr-field">시간
            <div className="pr-btns t">
              {blocks.map((b, i) => <button type="button" key={i} className={i === blk ? 'on' : ''} disabled={taken(i)} title={taken(i) ? '이미 신청된 시간입니다' : undefined} onClick={() => setBlk(i)}>{hm(b.start)}<br />~{hm(b.end)}{taken(i) && <small>신청됨</small>}</button>)}
            </div>
          </div>
          {overlap && <p className="pr-warn">{hm(overlap.start)}~{hm(overlap.end)} {kindLabel(overlap.act)} 신청이 이미 있습니다. (겹쳐도 신청할 수 있습니다)</p>}
          <button className="pri" type="submit" disabled={!choices.includes(date) || taken(blk)}>{fmtDay(date)} {hm(start)}~{hm(end)} {kindLabel(act)} 신청</button>
        </form>
      )}

      {!configured ? <p className="adm-empty">Firebase 설정이 필요합니다.</p> : slots === null ? <p className="adm-empty">불러오는 중…</p> : (
        <div className="pr-days">
          {days.map((d) => (
            <section key={d} className="pr-day">
              <h3>{fmtDay(d)}</h3>
              <SlotList slots={ofDay(d)} onDel={user ? del : undefined} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
