import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { acts } from './data/script.js'
import { db, configured } from './data/firebase.js'
import { statusOf, fmtTime, Lightbox, actTabs, actLabel, forAct, inAct } from './Admin.jsx'
import './admin.css'

// /props : 누구나 볼 수 있는 읽기 전용 소품 목록입니다. (수정은 /admin)
export default function Props() {
  const [items, setItems] = useState(null)
  const [err, setErr] = useState('')
  const [actId, setActId] = useState(acts[0].id)
  const [big, setBig] = useState('')

  useEffect(() => {
    if (!configured) return undefined
    return onSnapshot(
      query(collection(db, 'items'), where('kind', '==', 'props')),
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0))),
      (e) => setErr(`불러오지 못했습니다. (${e.code})`),
    )
  }, [])

  const all = actId === 'all'
  const list = forAct(items || [], actId)
  const total = (items || []).length
  const done = (items || []).filter((i) => statusOf(i) === '완료').length

  return (
    <div className="adm pub">
      <header className="adm-top">
        <h1>소품 목록</h1>
        <div><a href="/">← 메인으로</a></div>
      </header>
      {items && <p className="adm-warn">전체 {total}개 중 {done}개 준비 완료</p>}

      <div className="adm-tabs">
        {actTabs.map((a) => (
          <button key={a.id} className={a.id === actId ? 'on' : ''} onClick={() => setActId(a.id)}>
            {a.title}<small>{(items || []).filter((i) => inAct(i, a.id)).length}개</small>
          </button>
        ))}
      </div>

      {err ? <p className="adm-empty">{err}</p>
        : !items ? <p className="adm-empty">불러오는 중…</p>
        : list.length === 0 ? <p className="adm-empty">{actLabel(actId)} 소품이 아직 없습니다.</p>
        : (
          <div className="adm-scroll">
            <table className="adm-table">
              <thead>
                <tr><th>번호</th>{all && <th>막</th>}<th>소품명</th><th>사진</th><th>담당자</th><th>준비상태</th><th>완료시간</th></tr>
              </thead>
              <tbody>
                {list.map((i, idx) => {
                  const st = statusOf(i)
                  return (
                    <tr key={i.id} className={`st-${st}`}>
                      <td data-label="번호">{idx + 1}</td>
                      {all && <td data-label="막">{actLabel(i.act)}</td>}
                      <td data-label="소품명" className="nm"><b>{i.title}</b>{i.note && <p>{i.note}</p>}</td>
                      <td data-label="사진">{i.image ? <img className="thumb" src={i.image} alt="" onClick={() => setBig(i.imageBig || i.image)} /> : <span className="none">-</span>}</td>
                      <td data-label="담당자">{i.owner || <span className="none">-</span>}</td>
                      <td data-label="준비상태"><span className={`badge-st st-${st}`}>{st}</span></td>
                      <td data-label="완료시간">{i.doneAt ? fmtTime(i.doneAt) : <span className="none">-</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      <Lightbox src={big} onClose={() => setBig('')} />
    </div>
  )
}
