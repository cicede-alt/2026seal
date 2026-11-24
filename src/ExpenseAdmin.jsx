import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from './data/firebase.js'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const cats = ['점심', '간식', '소품', '의상']
const blank = () => ({ date: today(), type: 'out', cat: cats[0], title: '', amount: '' })
const won = (n) => Number(n || 0).toLocaleString('ko-KR')
// 지출은 목록에 -금액, 수입은 +금액으로 보입니다. (type 이 없는 예전 데이터는 지출)
const signed = (i) => (i.type === 'in' ? 1 : -1) * (Number(i.amount) || 0)
const show = (i) => `${i.type === 'in' ? '+' : '-'}${won(i.amount)}`

/** 관리자 > 경비. 번호·일자·내용·금액 목록과 합계 (로그인한 관리자만 읽고 쓸 수 있습니다). */
export default function ExpenseAdmin() {
  const [items, setItems] = useState(null)
  const [status, setStatus] = useState('')
  const [form, setForm] = useState(blank)
  const [editId, setEditId] = useState(null)

  useEffect(() => onSnapshot(
    collection(db, 'expenses'),
    (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0))),
    (e) => setStatus(`불러오기 실패: ${e.code}`),
  ), [])

  const run = (p) => {
    setStatus('저장 중…')
    return p.then(() => setStatus('저장됨')).catch((e) => setStatus(`저장 실패: ${e.code || e.message}`))
  }
  const reset = () => { setForm(blank()); setEditId(null) }
  const submit = (e) => {
    e.preventDefault()
    const amount = Math.round(Number(form.amount))
    if (!form.date || !form.title.trim() || !Number.isFinite(amount) || form.amount === '') return
    const data = { date: form.date, type: form.type, cat: form.cat, title: form.title.trim(), amount }
    if (editId) run(updateDoc(doc(db, 'expenses', editId), data))
    else run(addDoc(collection(db, 'expenses'), { ...data, createdAt: Date.now() }))
    reset()
  }
  const edit = (i) => { setEditId(i.id); setForm({ date: i.date, type: i.type === 'in' ? 'in' : 'out', cat: i.cat || cats[0], title: i.title, amount: String(i.amount) }) }
  const del = (i) => { if (confirm(`"${i.date} ${i.title}" 경비를 삭제할까요?`)) run(deleteDoc(doc(db, 'expenses', i.id))) }

  if (!items) return <p className="adm-empty">{status || '불러오는 중…'}</p>
  const total = items.reduce((s, i) => s + signed(i), 0)
  const fmt = (n) => `${n < 0 ? '-' : '+'}${won(Math.abs(n))}`
  // 구분별 합계: 수입 / 지출 따로 (구분이 없는 예전 데이터는 '미분류')
  const groups = [['in', '수입'], ['out', '지출']].map(([t, label]) => {
    const l = items.filter((i) => (i.type === 'in') === (t === 'in'))
    const rows = [...cats, '미분류'].map((c) => {
      const m = l.filter((i) => (cats.includes(i.cat) ? i.cat : '미분류') === c)
      return { c, n: m.length, sum: m.reduce((s, i) => s + (Number(i.amount) || 0), 0) }
    }).filter((x) => x.n > 0)
    return { label, rows, sum: rows.reduce((s, x) => s + x.sum, 0) }
  })

  return (
    <>
      <p className="adm-warn">관리자만 볼 수 있는 경비 내역입니다. {status && <b>· {status}</b>}</p>

      <form className="adm-form exp-form" onSubmit={submit}>
        <div className="adm-row">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="일자" />
          <span className="adm-radio" style={{ display: 'flex', gap: 10, alignItems: 'center', whiteSpace: 'nowrap' }}>
            {[['out', '지출'], ['in', '수입']].map(([v, l]) => (
              <label key={v}><input type="radio" name="exp-type" checked={form.type === v} onChange={() => setForm({ ...form, type: v })} /> {l}</label>
            ))}
          </span>
          <input type="number" inputMode="numeric" placeholder="금액 (원)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} aria-label="금액" />
        </div>
        <select value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })} aria-label="구분">
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input placeholder="내용 (예: 소품 구매 - 칼 2개)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div>
          <button className="pri" type="submit">{editId ? '수정 저장' : '경비추가(저장)'}</button>
          {editId && <button type="button" onClick={reset}>취소</button>}
        </div>
      </form>

      {items.length === 0 ? (
        <div className="adm-empty"><p>등록된 경비가 없습니다.</p></div>
      ) : (
        <div className="adm-scroll">
          <table className="adm-table exp-table">
            <thead><tr><th>번호</th><th>일자</th><th>구분</th><th>내용</th><th style={{ textAlign: 'right' }}>금액</th><th></th></tr></thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={i.id}>
                  <td data-label="번호">{idx + 1}</td>
                  <td data-label="일자">{i.date.replaceAll('-', '.')}</td>
                  <td data-label="구분">{i.cat || <span className="none">-</span>}</td>
                  <td data-label="내용" className="nm"><b>{i.title}</b></td>
                  <td data-label="금액" style={{ textAlign: 'right' }}>{show(i)}</td>
                  <td className="acts">
                    <button onClick={() => edit(i)} aria-label="수정" title="수정">✏️</button>
                    <button onClick={() => del(i)} aria-label="삭제" title="삭제">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="sum">
                <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>합계 ({items.length}건)</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <table className="adm-table exp-cat">
            <tbody>
              {groups.map((g) => [
                <tr key={g.label} className="grp"><td>{g.label}</td><td>{g.rows.length ? won(g.sum) : ''}</td></tr>,
                ...g.rows.map((x) => (
                  <tr key={g.label + x.c}><td>{x.c}({x.n}건)</td><td>{won(x.sum)}</td></tr>
                )),
                !g.rows.length && <tr key={g.label + '-'}><td><span className="none">내역 없음</span></td><td></td></tr>,
              ])}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
