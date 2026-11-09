import { useEffect, useState } from 'react'
import { addDoc, collection, onSnapshot, query, where } from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { acts } from './data/script.js'
import { auth, db, configured } from './data/firebase.js'
import { statusOf, fmtTime, Lightbox, Login, shrink, actTabs, actLabel, forAct, inAct } from './Admin.jsx'
import './admin.css'

/** 소품 추가 입력칸 (로그인한 사람에게만 보입니다) */
function AddForm({ actId, onMsg }) {
  const blank = { title: '', owner: '', note: '', image: '', imageBig: '' }
  const [form, setForm] = useState(blank)
  const [act, setAct] = useState(null)
  const [busy, setBusy] = useState(false)
  const curAct = act ?? (actId === 'all' ? acts[0].id : actId)

  const upload = async (e) => {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    setBusy(true); onMsg('사진 변환 중…')
    try {
      const { url, big } = await shrink(f)
      setForm((x) => ({ ...x, image: url, imageBig: big }))
      onMsg('')
    } catch { onMsg('사진을 처리할 수 없습니다. 다른 사진으로 해 보세요.') }
    setBusy(false)
  }
  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || busy) return
    setBusy(true); onMsg('저장 중…')
    try {
      await addDoc(collection(db, 'items'), {
        kind: 'props', act: curAct, title: form.title.trim(), owner: form.owner.trim(), note: form.note.trim(),
        image: form.image, imageBig: form.imageBig, status: '준비전', doneAt: null, order: Date.now(),
      })
      setForm(blank); setAct(null); onMsg('저장됨')
    } catch (x) { onMsg(`저장 실패: ${x.code || x.message}`) }
    setBusy(false)
  }
  return (
    <form className="adm-form" onSubmit={submit}>
      <select value={curAct} onChange={(e) => setAct(e.target.value === 'etc' ? 'etc' : Number(e.target.value))} aria-label="막 선택">
        {actTabs.filter((a) => a.id !== 'all').map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
      </select>
      <input placeholder="소품명" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <input placeholder="담당자" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
      <textarea rows={2} placeholder="사용 장면 / 메모" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      <div className="adm-img">
        <label className="adm-file">
          {busy && !form.image ? '처리 중…' : form.image ? '사진 바꾸기' : '사진 추가'}
          <input type="file" accept="image/*" hidden disabled={busy} onChange={upload} />
        </label>
        {form.image ? <img src={form.image} alt="" /> : null}
        {form.image && <button type="button" onClick={() => setForm({ ...form, image: '', imageBig: '' })}>사진 삭제</button>}
      </div>
      <div><button className="pri" type="submit" disabled={busy}>소품추가(저장)</button></div>
    </form>
  )
}

// /props : 누구나 볼 수 있는 읽기 전용 소품 목록입니다. (수정은 /admin)
export default function Props() {
  const [items, setItems] = useState(null)
  const [err, setErr] = useState('')
  const [actId, setActId] = useState(acts[0].id)
  const [big, setBig] = useState('')
  const [user, setUser] = useState(null)
  const [msg, setMsg] = useState('')
  const [adding, setAdding] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)

  useEffect(() => (configured ? onAuthStateChanged(auth, (u) => { setUser(u); if (u) setLoginOpen(false) }) : undefined), [])

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
  const done = (items || []).filter((i) => statusOf(i) === '준비완료').length

  return (
    <div className="adm pub">
      <header className="adm-top">
        <h1>소품 목록</h1>
        <div><a href="/">← 메인으로</a></div>
      </header>
      <div className="pub-add">
        {user ? (
          <>
            <button className="pri" onClick={() => setAdding(!adding)}>{adding ? '추가 닫기' : '+ 소품 추가'}</button>
            <button onClick={() => signOut(auth)}>로그아웃</button>
          </>
        ) : (
          <button onClick={() => setLoginOpen(!loginOpen)}>{loginOpen ? '닫기' : '로그인하고 소품 추가'}</button>
        )}
        {msg && <span className="adm-status">{msg}</span>}
      </div>
      {!user && loginOpen && <Login inline />}
      {user && adding && <AddForm actId={actId} onMsg={setMsg} />}
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
                      <td data-label="사진">{i.image ? <img className="thumb" src={i.image} alt="" onClick={() => setBig(i.imageBig || i.image)} /> : <div className="noimg">준비중</div>}</td>
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
