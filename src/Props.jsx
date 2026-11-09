import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { acts } from './data/script.js'
import { auth, db, configured } from './data/firebase.js'
import { statusOf, statuses, fmtTime, Lightbox, Login, shrink, actTabs, actLabel, forAct, inAct } from './Admin.jsx'
import './admin.css'

/** 소품 추가·수정 입력칸 (로그인한 사람에게만 보입니다). item 이 있으면 수정, 없으면 추가 */
function ItemForm({ actId, item, onMsg, onDone }) {
  const blank = { title: '', owner: '', note: '', image: '', imageBig: '' }
  const [form, setForm] = useState(() => (item
    ? { title: item.title || '', owner: item.owner || '', note: item.note || '', image: item.image || '', imageBig: item.imageBig || '' }
    : blank))
  const [act, setAct] = useState(item ? item.act : null)
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
      const data = { act: curAct, title: form.title.trim(), owner: form.owner.trim(), note: form.note.trim(), image: form.image, imageBig: form.imageBig }
      if (item) {
        await updateDoc(doc(db, 'items', item.id), data)
        onDone()
      } else {
        await addDoc(collection(db, 'items'), { ...data, kind: 'props', status: '준비전', doneAt: null, order: Date.now() })
        setForm(blank); setAct(null)
      }
      onMsg('저장됨')
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
      <div>
        <button className="pri" type="submit" disabled={busy}>{item ? '수정 저장' : '소품추가(저장)'}</button>
        {item && <button type="button" onClick={onDone}>취소</button>}
      </div>
    </form>
  )
}

// /props : 누구나 볼 수 있는 소품 목록입니다. 로그인하면 추가·수정·삭제·상태 변경도 할 수 있습니다.
export default function Props() {
  const [items, setItems] = useState(null)
  const [err, setErr] = useState('')
  const [actId, setActId] = useState(acts[0].id)
  const [big, setBig] = useState('')
  const [user, setUser] = useState(null)
  const [msg, setMsg] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
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

  // 쓰기 결과는 상단에 표시합니다. (성공한 변경은 onSnapshot 으로 바로 목록에 반영됩니다.)
  const run = (p) => {
    setMsg('저장 중…')
    return p.then(() => setMsg('저장됨')).catch((e) => setMsg(`저장 실패: ${e.code || e.message}`))
  }
  const setStatus = (i, st) => run(updateDoc(doc(db, 'items', i.id), { status: st, doneAt: st === '준비완료' ? Date.now() : null }))
  const del = (i) => { if (confirm(`"${i.title}" 소품을 삭제할까요?`)) { if (editing?.id === i.id) setEditing(null); run(deleteDoc(doc(db, 'items', i.id))) } }
  const edit = (i) => { setAdding(false); setEditing(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }

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
            <button className="pri" onClick={() => { setEditing(null); setAdding(!adding) }}>{adding ? '추가 닫기' : '+ 소품 추가'}</button>
            <button onClick={() => signOut(auth)}>로그아웃</button>
          </>
        ) : (
          <button onClick={() => setLoginOpen(!loginOpen)}>{loginOpen ? '닫기' : '로그인하고 소품 추가'}</button>
        )}
        {msg && <span className="adm-status">{msg}</span>}
      </div>
      {!user && loginOpen && <Login inline />}
      {user && (adding || editing) && <ItemForm key={editing ? editing.id : 'new'} actId={actId} item={editing} onMsg={setMsg} onDone={() => setEditing(null)} />}
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
                <tr><th>번호</th>{all && <th>막</th>}<th>소품명</th><th>사진</th><th>담당자</th><th>준비상태</th><th>완료시간</th>{user && <th></th>}</tr>
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
                      <td data-label="준비상태">
                        {user
                          ? <select value={st} onChange={(e) => setStatus(i, e.target.value)}>{statuses.map((x) => <option key={x} value={x}>{x}</option>)}</select>
                          : <span className={`badge-st st-${st}`}>{st}</span>}
                      </td>
                      <td data-label="완료시간">{i.doneAt ? fmtTime(i.doneAt) : <span className="none">-</span>}</td>
                      {user && (
                        <td className="acts">
                          <button onClick={() => edit(i)}>수정</button>
                          <button onClick={() => del(i)}>삭제</button>
                        </td>
                      )}
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
