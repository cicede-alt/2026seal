import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './data/firebase.js'
import { schedule as defaults } from './data/schedule.js'

const blank = { date: '', time: '', title: '', place: '' }
const day = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return '일월화수목금토'[new Date(y, m - 1, d).getDay()]
}

/** 관리자 > 연습 및 공연 일정 관리. 메인 화면의 '01 SCHEDULE' 에 그대로 반영됩니다. */
export default function ScheduleAdmin() {
  const [items, setItems] = useState(null)
  const [status, setStatus] = useState('')
  const [form, setForm] = useState(blank)
  const [editId, setEditId] = useState(null)

  useEffect(() => onSnapshot(
    collection(db, 'schedule'),
    (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))),
    (e) => setStatus(`불러오기 실패: ${e.code}`),
  ), [])

  const run = (p) => {
    setStatus('저장 중…')
    return p.then(() => setStatus('저장됨')).catch((e) => setStatus(`저장 실패: ${e.code || e.message}`))
  }
  const reset = () => { setForm(blank); setEditId(null) }
  const submit = (e) => {
    e.preventDefault()
    if (!form.date || !form.title.trim()) return
    const data = { date: form.date, time: form.time, title: form.title.trim(), place: form.place.trim() }
    if (editId) run(updateDoc(doc(db, 'schedule', editId), data))
    else run(addDoc(collection(db, 'schedule'), data))
    reset()
  }
  const edit = (i) => { setEditId(i.id); setForm({ date: i.date, time: i.time || '', title: i.title, place: i.place || '' }) }
  const del = (i) => { if (confirm(`"${i.date} ${i.title}" 일정을 삭제할까요?`)) run(deleteDoc(doc(db, 'schedule', i.id))) }
  const seed = () => {
    if (!confirm(`기본 일정 ${defaults.length}개를 불러옵니다. 계속할까요?`)) return
    const batch = writeBatch(db)
    defaults.forEach((s) => batch.set(doc(collection(db, 'schedule')), s))
    run(batch.commit())
  }

  if (!items) return <p className="adm-empty">{status || '불러오는 중…'}</p>

  return (
    <>
      <p className="adm-warn">여기서 수정한 내용은 메인 화면의 ‘연습 및 공연 일정’에 바로 반영됩니다. {status && <b>· {status}</b>}</p>

      <form className="adm-form" onSubmit={submit}>
        <div className="adm-row">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="날짜" />
          <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} aria-label="시간" />
        </div>
        <input placeholder="일정명 (예: 연습 #7 (1~4막))" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input placeholder="장소" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
        <div>
          <button className="pri" type="submit">{editId ? '수정 저장' : '일정추가(저장)'}</button>
          {editId && <button type="button" onClick={reset}>취소</button>}
        </div>
      </form>

      {items.length === 0 ? (
        <div className="adm-empty">
          <p>등록된 일정이 없습니다. (지금 메인에는 기본 일정이 보입니다)</p>
          <button className="pri" onClick={seed}>기본 일정 불러오기</button>
        </div>
      ) : (
        <div className="adm-scroll">
          <table className="adm-table">
            <thead><tr><th>번호</th><th>날짜</th><th>시간</th><th>일정명</th><th>장소</th><th></th></tr></thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={i.id}>
                  <td data-label="번호">{idx + 1}</td>
                  <td data-label="날짜">{i.date} ({day(i.date)})</td>
                  <td data-label="시간">{i.time || <span className="none">-</span>}</td>
                  <td data-label="일정명" className="nm"><b>{i.title}</b></td>
                  <td data-label="장소">{i.place || <span className="none">-</span>}</td>
                  <td className="acts">
                    <button onClick={() => edit(i)}>수정</button>
                    <button onClick={() => del(i)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
