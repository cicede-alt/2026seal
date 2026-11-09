import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore'
import { acts } from './data/script.js'
import { auth, db, configured, toEmail } from './data/firebase.js'
import ScheduleAdmin from './ScheduleAdmin.jsx'
import './admin.css'

const kinds = [
  { id: 'props', label: '소품', title: '소품명', owner: '담당자', note: '사용 장면 / 메모' },
  { id: 'costumes', label: '의상', title: '의상명', owner: '착용 배역', note: '메모 (색상·사이즈 등)' },
  { id: 'situations', label: '상황', title: '상황 제목', owner: '등장 배역', note: '상황 설명' },
]
// 막 탭: 1~4막 + 기타 + 전체(1~4막·기타 모두). '전체'는 보기 전용 필터이고 저장되는 값은 아닙니다.
export const actTabs = [...acts.map((a) => ({ id: a.id, title: a.title })), { id: 'etc', title: '기타' }, { id: 'all', title: '전체' }]
export const actLabel = (id) => actTabs.find((a) => a.id === id)?.title || '기타'
const actRank = (id) => { const n = actTabs.findIndex((a) => a.id === id); return n < 0 ? 99 : n }
export const inAct = (i, actId) => actId === 'all' || i.act === actId
// '전체' 에서는 막 순서(1막→4막→기타)대로, 같은 막 안에서는 저장된 순서대로 보여 줍니다.
export const forAct = (items, actId) => {
  const l = items.filter((i) => inAct(i, actId))
  return actId === 'all' ? l.sort((a, b) => actRank(a.act) - actRank(b.act)) : l
}
const statuses = ['준비 전', '준비 중', '완료']
// 예전 데이터(done 체크)도 상태로 읽어 줍니다.
export const statusOf = (i) => i.status || (i.done ? '완료' : '준비 전')
export const fmtTime = (ms) => {
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const MAX_IMG = 600 * 1024 // 저장 이미지 최대 크기(바이트). Firestore 문서 1MB 제한 안쪽으로.

const IMG_SIZE = 100 // 목록용 썸네일 (px, 정사각형)
const BIG_SIZE = 600 // 팝업용 큰 사진 (긴 변 기준 px)

const toUrl = (blob) => new Promise((ok, no) => {
  const fr = new FileReader()
  fr.onload = () => ok(String(fr.result))
  fr.onerror = no
  fr.readAsDataURL(blob)
})
const encode = async (c, q) => {
  const toBlob = (type, qq) => new Promise((ok) => c.toBlob(ok, type, qq))
  let blob = await toBlob('image/webp', q)
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg', q) // WebP 저장이 안 되는 브라우저
  if (blob.size > MAX_IMG) blob = await toBlob(blob.type, 0.4)
  if (blob.size > MAX_IMG) throw new Error('too large')
  return blob
}

// 브라우저에서 두 가지로 줄여 WebP data URL 로 돌려줍니다.
//  - thumb: 가운데를 정사각형으로 잘라 100x100 (목록용)
//  - big:   긴 변 600px 이내, 비율 유지 (팝업용)
async function shrink(file) {
  const bmp = await createImageBitmap(file)
  const side = Math.min(bmp.width, bmp.height)
  const t = document.createElement('canvas')
  t.width = IMG_SIZE
  t.height = IMG_SIZE
  const tc = t.getContext('2d')
  tc.imageSmoothingQuality = 'high'
  tc.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, IMG_SIZE, IMG_SIZE)

  const r = Math.min(1, BIG_SIZE / Math.max(bmp.width, bmp.height))
  const g = document.createElement('canvas')
  g.width = Math.round(bmp.width * r)
  g.height = Math.round(bmp.height * r)
  const gc = g.getContext('2d')
  gc.imageSmoothingQuality = 'high'
  gc.drawImage(bmp, 0, 0, g.width, g.height)

  const [tb, gb] = [await encode(t, 0.7), await encode(g, 0.75)]
  return { url: await toUrl(tb), big: await toUrl(gb), size: tb.size + gb.size }
}

/** 사진 클릭 시 크게 보여주는 팝업 (바깥을 누르거나 Esc 로 닫기) */
export function Lightbox({ src, onClose }) {
  useEffect(() => {
    if (!src) return undefined
    const on = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [src, onClose])
  if (!src) return null
  return (
    <div className="adm-big" onClick={onClose} role="dialog" aria-label="사진 크게 보기">
      <img src={src} alt="" />
      <button onClick={onClose} aria-label="닫기">✕</button>
    </div>
  )
}

function Login() {
  const [f, setF] = useState({ id: '', pw: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!f.id.trim() || !f.pw) return
    setBusy(true); setErr('')
    try {
      await signInWithEmailAndPassword(auth, toEmail(f.id), f.pw)
    } catch (x) {
      const bad = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email']
      setErr(bad.includes(x.code) ? '아이디 또는 비밀번호가 틀렸습니다.'
        : x.code === 'auth/too-many-requests' ? '시도가 너무 많습니다. 잠시 후 다시 해 주세요.'
        : `로그인 오류: ${x.code || x.message}`)
    }
    setBusy(false)
  }
  return (
    <div className="adm adm-login">
      <h1>무대 관리자</h1>
      <form className="adm-form" onSubmit={submit}>
        <input placeholder="아이디" autoComplete="username" value={f.id} onChange={(e) => setF({ ...f, id: e.target.value })} />
        <input placeholder="비밀번호" type="password" autoComplete="current-password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} />
        {err && <p className="adm-err">{err}</p>}
        <button className="pri" type="submit" disabled={busy}>{busy ? '확인 중…' : '로그인'}</button>
      </form>
    </div>
  )
}

const blank = { title: '', owner: '', note: '', image: '', imageBig: '' }

function Panel() {
  const [items, setItems] = useState(null)
  const [status, setStatus] = useState('')
  const [actId, setActId] = useState(acts[0].id)
  const [kind, setKind] = useState('props')
  const [form, setForm] = useState(blank)
  const [big, setBig] = useState('')
  const [view, setViewState] = useState(() => {
    try { return localStorage.getItem('adminView') === 'cards' ? 'cards' : 'table' } catch { return 'table' }
  })
  const setView = (v) => { setViewState(v); try { localStorage.setItem('adminView', v) } catch { /* ignore */ } }
  const [editId, setEditId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [section, setSection] = useState('stage')
  const k = kinds.find((x) => x.id === kind)

  useEffect(() => onSnapshot(
    collection(db, 'items'),
    (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0))),
    (e) => setStatus(`불러오기 실패: ${e.code}`),
  ), [])

  // 쓰기 실패는 화면에 표시합니다. (성공은 onSnapshot 으로 바로 반영됩니다.)
  const run = (p) => {
    setStatus('저장 중…')
    return p.then(() => setStatus('저장됨')).catch((e) => setStatus(`저장 실패: ${e.code || e.message}`))
  }

  if (!items) return <div className="adm"><p className="adm-empty">{status || '불러오는 중…'}</p></div>

  const all = actId === 'all'
  const list = forAct(items.filter((i) => i.kind === kind), actId)
  const count = (a, kd) => items.filter((i) => inAct(i, a) && (!kd || i.kind === kd)).length
  const formAct = form.act ?? (all ? acts[0].id : actId)
  const reset = () => { setForm(blank); setEditId(null) }
  const pick = (setter, v) => { setter(v); reset() }

  const upload = async (e) => {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    setUploading(true); setStatus('이미지 변환 중…')
    try {
      const { url, big, size } = await shrink(f)
      setForm((x) => ({ ...x, image: url, imageBig: big }))
      setStatus(`사진 준비됨 (${Math.round(size / 1024)}KB) · 저장 버튼을 눌러야 반영됩니다`)
    } catch { setStatus('이미지를 처리할 수 없습니다. 다른 사진으로 해 보세요.') }
    setUploading(false)
  }
  const submit = (e) => {
    e.preventDefault()
    if (!form.title.trim() || uploading) return
    const data = { act: formAct, title: form.title.trim(), owner: form.owner.trim(), note: form.note.trim(), image: form.image, imageBig: form.imageBig }
    if (editId) run(updateDoc(doc(db, 'items', editId), data))
    else run(addDoc(collection(db, 'items'), { ...data, kind, status: '준비 전', doneAt: null, order: Date.now() }))
    reset()
  }
  const edit = (i) => { setEditId(i.id); setForm({ act: i.act, title: i.title, owner: i.owner || '', note: i.note || '', image: i.image || '', imageBig: i.imageBig || '' }) }
  const del = (i) => { if (confirm(`"${i.title}" 항목을 삭제할까요?`)) run(deleteDoc(doc(db, 'items', i.id))) }
  const setStatus_ = (i, st) => run(updateDoc(doc(db, 'items', i.id), { status: st, doneAt: st === '완료' ? Date.now() : null }))
  const move = (idx, d) => {
    const a = list[idx], b = list[idx + d]
    if (!b) return
    const batch = writeBatch(db)
    batch.update(doc(db, 'items', a.id), { order: b.order })
    batch.update(doc(db, 'items', b.id), { order: a.order })
    run(batch.commit())
  }

  return (
    <div className="adm">
      <header className="adm-top">
        <h1>무대 관리자</h1>
        <div>
          <span className="adm-status">{status}</span>
          <a href="/">← 사이트로</a>
          <button onClick={() => signOut(auth)}>로그아웃</button>
        </div>
      </header>

      <div className="adm-tabs main">
        <button className={section === 'stage' ? 'on' : ''} onClick={() => setSection('stage')}>무대 준비 (소품·의상·상황)</button>
        <button className={section === 'schedule' ? 'on' : ''} onClick={() => setSection('schedule')}>일정 관리</button>
      </div>

      {section === 'schedule' ? <ScheduleAdmin /> : (
      <>
      <div className="adm-tabs">
        {kinds.map((x) => (
          <button key={x.id} className={x.id === kind ? 'on' : ''} onClick={() => pick(setKind, x.id)}>
            {x.label}<small>{count(actId, x.id)}</small>
          </button>
        ))}
      </div>

      <div className="adm-tabs sub">
        {actTabs.map((a) => (
          <button key={a.id} className={a.id === actId ? 'on' : ''} onClick={() => pick(setActId, a.id)}>
            {a.title}<small>{count(a.id)}건</small>
          </button>
        ))}
      </div>
      <form className="adm-form" onSubmit={submit}>
        <select value={formAct} onChange={(e) => setForm({ ...form, act: e.target.value === 'etc' ? 'etc' : Number(e.target.value) })} aria-label="막 선택">
          {actTabs.filter((a) => a.id !== 'all').map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        <input placeholder={k.title} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input placeholder={k.owner} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
        <textarea rows={2} placeholder={k.note} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <div className="adm-img">
          <label className="adm-file">
            {uploading ? '변환 중…' : form.image ? '사진 바꾸기' : '사진 추가'}
            <input type="file" accept="image/*" hidden disabled={uploading} onChange={upload} />
          </label>
          {form.image && <img src={form.image} alt="" />}
          {form.image && <button type="button" onClick={() => setForm({ ...form, image: '', imageBig: '' })}>사진 삭제</button>}
        </div>
        <div>
          <button className="pri" type="submit" disabled={uploading}>{editId ? '수정 저장' : `${k.label}추가(저장)`}</button>
          {editId && <button type="button" onClick={reset}>취소</button>}
        </div>
      </form>

      {list.length === 0 ? (
        <p className="adm-empty">{actLabel(actId)} {k.label}이(가) 아직 없습니다.</p>
      ) : (
        <>
        <div className="adm-view">
          <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>표 보기</button>
          <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}>카드 보기</button>
        </div>
        <div className="adm-scroll">
        <table className={`adm-table${view === 'cards' ? ' cards' : ''}`}>
          <thead>
            <tr><th>번호</th>{all && <th>막</th>}<th>{k.title}</th><th>사진</th><th>{k.owner}</th><th>준비상태</th><th>완료시간</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((i, idx) => {
              const st = statusOf(i)
              return (
                <tr key={i.id} className={`st-${st}`}>
                  <td data-label="번호">{idx + 1}</td>
                  {all && <td data-label="막">{actLabel(i.act)}</td>}
                  <td data-label={k.title} className="nm"><b>{i.title}</b>{i.note && <p>{i.note}</p>}</td>
                  <td data-label="사진">{i.image ? <img className="thumb" src={i.image} alt="" onClick={() => setBig(i.imageBig || i.image)} /> : <div className="noimg">준비중</div>}</td>
                  <td data-label={k.owner}>{i.owner || <span className="none">-</span>}</td>
                  <td data-label="준비상태">
                    <select value={st} onChange={(e) => setStatus_(i, e.target.value)}>
                      {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td data-label="완료시간">{i.doneAt ? fmtTime(i.doneAt) : <span className="none">-</span>}</td>
                  <td className="acts">
                    <button onClick={() => move(idx, -1)} disabled={all || idx === 0} aria-label="위로">↑</button>
                    <button onClick={() => move(idx, 1)} disabled={all || idx === list.length - 1} aria-label="아래로">↓</button>
                    <button onClick={() => edit(i)}>수정</button>
                    <button onClick={() => del(i)}>삭제</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        </>
      )}
      </>
      )}
      <Lightbox src={big} onClose={() => setBig('')} />
    </div>
  )
}

export default function Admin() {
  const [user, setUser] = useState(undefined)
  useEffect(() => (configured ? onAuthStateChanged(auth, setUser) : undefined), [])
  if (!configured) {
    return (
      <div className="adm adm-login">
        <h1>무대 관리자</h1>
        <p className="adm-empty">Firebase 설정이 아직 없습니다.<br />src/data/firebase.js 의 apiKey, appId 를 채워 주세요.</p>
      </div>
    )
  }
  if (user === undefined) return <div className="adm adm-login"><p className="adm-empty">확인 중…</p></div>
  return user ? <Panel /> : <Login />
}
