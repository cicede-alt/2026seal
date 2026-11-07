import { useEffect, useRef, useState } from 'react'
import { event } from './data/event.js'
import { schedule } from './data/schedule.js'
import { acts } from './data/script.js'
import { cast } from './data/cast.js'
import { roles, act1 } from './data/act1test.js'
import './App.css'

const menu = [
  { id: 'schedule', label: '일정' },
  { id: 'script', label: '대본' },
  { id: 'cast', label: '출연진' },
]

function Section({ id, no, en, ko, note, tone, children }) {
  return (
    <section id={id} className="band" data-tone={tone}>
      <div className="section">
        <p className="eyebrow">{no} {en}</p>
        <div className="sec-head">
          <h2>{ko}</h2>
          {note && <p className="sec-note">{note}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

const toDate = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// 미리보기용: 주소 끝에 ?today=2026-11-10 을 붙이면 그 날짜 기준으로 표시됩니다.
const getToday = () => {
  const p = new URLSearchParams(window.location.search).get('today')
  const t = p ? toDate(p) : new Date()
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

function Schedule() {
  const today = getToday()
  const nextIdx = schedule.findIndex((s) => toDate(s.date) >= today)
  return (
    <ul className="cards">
      {schedule.map((s, i) => {
        const d = toDate(s.date)
        const diff = Math.round((d - today) / 86400000)
        const state = diff < 0 ? 'past' : i === nextIdx ? 'next' : 'upcoming'
        const badge =
          diff < 0 ? '지난 일정' : diff === 0 ? '오늘' : i === nextIdx ? `다가오는 일정 · D-${diff}` : ''
        return (
          <li key={s.date + s.title} className={`card ${state}`}>
            <div className="day">
              <span>{d.getMonth() + 1}월</span>
              <strong>{d.getDate()}</strong>
              <span>{'일월화수목금토'[d.getDay()]}요일</span>
            </div>
            <div>
              {badge && <em className="badge">{badge}</em>}
              <h3>{s.title}</h3>
              <p>{s.time} · {s.place}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Script() {
  const [actId, setActId] = useState(acts[0].id)
  const [oldVer, setOldVer] = useState(null)
  const act = acts.find((a) => a.id === actId)
  const olds = (act.old || []).filter((o) => o.docUrl)
  const viewing = olds.find((o) => o.version === oldVer)
  const pick = (id) => { setActId(id); setOldVer(null) }
  return (
    <>
      <div className="tabs">
        {acts.map((a) => (
          <button key={a.id} className={a.id === actId ? 'on' : ''} onClick={() => pick(a.id)}>
            {a.title}<small>{a.version}</small>
          </button>
        ))}
      </div>
      {viewing ? (
        <div className="ver-warn">
          ⚠ 이전 버전({viewing.version})입니다. 최신은 {act.version}
          <button onClick={() => setOldVer(null)}>최신본 보기</button>
        </div>
      ) : (
        act.changes && act.version !== 'v1.0' && (
          <p className="ver-note"><b>{act.version} 변경</b> {act.changes}</p>
        )
      )}
      {act.docUrl ? (
        <iframe className={`doc${viewing ? ' old' : ''}`} src={viewing ? viewing.docUrl : act.docUrl} title={act.title} />
      ) : (
      <div className="lines">
        {act.lines.map((l, i) =>
          l.note ? (
            <p key={i} className="note">{l.note}</p>
          ) : (
            <p key={i}><b>{l.who}</b><span>{l.text}</span></p>
          ),
        )}
      </div>
      )}
      {!viewing && olds.length > 0 && (
        <p className="ver-old">
          {olds.map((o) => (
            <button key={o.version} onClick={() => setOldVer(o.version)}>이전 버전({o.version}) 보기</button>
          ))}
        </p>
      )}
    </>
  )
}

// 씬 단위로 페이지를 나눕니다. (막/장 제목은 뒤따르는 씬 페이지에 붙음)
const pages = (() => {
  const out = []
  let cur = []
  let hasScene = false
  for (const x of act1) {
    if (x.t === 'scene' && hasScene) { out.push(cur); cur = []; hasScene = false }
    if (x.t === 'scene') hasScene = true
    cur.push(x)
  }
  if (cur.length) out.push(cur)
  return out
})()
const palette = ['#ffe7a3', '#ffc9c9', '#ffd8a8', '#c3f0ca', '#b9e6f5', '#d9ccff', '#f6c6e8', '#e0e0e0']
const pageTitle = (p) => (p.find((x) => x.t === 'scene')?.text || '').replace(/^씬\s*/, '')

function RoleScript() {
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }
  const [mine, setMine] = useState(() => {
    const v = read('myRoles', null)
    return Array.isArray(v) ? v : []
  })
  const [colors, setColors] = useState(() => read('roleColors', {}))
  const [hideCue, setHideCue] = useState(false)
  const [pg, setPg] = useState(0)
  const [all, setAll] = useState(true)
  const bodyRef = useRef(null)
  const colorOf = (r) => colors[r] || palette[Math.max(0, roles.indexOf(r)) % palette.length]
  const toggle = (r) => {
    const next = mine.includes(r) ? mine.filter((x) => x !== r) : [...mine, r]
    setMine(next)
    write('myRoles', next)
  }
  const clear = () => { setMine([]); write('myRoles', []) }
  const setColor = (r, c) => {
    const next = { ...colors, [r]: c }
    setColors(next)
    write('roleColors', next)
  }
  const go = (n) => {
    setAll(false)
    setPg(Math.max(0, Math.min(pages.length - 1, n)))
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }
  const nav = (
    <div className="rs-pager">
      <button onClick={() => go(pg - 1)} disabled={all || pg === 0}>← 이전</button>
      <div className="rs-pages">
        {pages.map((p, i) => (
          <button key={i} className={!all && i === pg ? 'on' : ''} onClick={() => go(i)} title={pageTitle(p)}>{i + 1}</button>
        ))}
        <button className={`rs-all${all ? ' on' : ''}`} onClick={() => { setAll(true); if (bodyRef.current) bodyRef.current.scrollTop = 0 }}>전체 보기</button>
      </div>
      <button onClick={() => go(pg + 1)} disabled={all || pg === pages.length - 1}>다음 →</button>
    </div>
  )
  return (
    <div className="rs">
      <div className="rs-bar">
        <span>내 배역 (여러 명 선택 가능)</span>
        <button className={mine.length === 0 ? 'on' : ''} onClick={clear}>선택 안 함</button>
        {roles.map((r) => (
          <button key={r} className={mine.includes(r) ? 'on' : ''} style={mine.includes(r) ? { background: colorOf(r), borderColor: colorOf(r), color: '#222' } : undefined} onClick={() => toggle(r)}>{r}</button>
        ))}
        {mine.map((r) => (
          <div className="rs-colors" key={r}>
            <span>{r} 색상</span>
            {palette.map((c) => (
              <button key={c} className={c === colorOf(r) ? 'on' : ''} style={{ background: c }} onClick={() => setColor(r, c)} aria-label={`${r} 색상 ${c}`} />
            ))}
          </div>
        ))}
        <label className="rs-cue"><input type="checkbox" checked={hideCue} onChange={(e) => setHideCue(e.target.checked)} /> 음악·조명 큐 숨기기</label>
      </div>
      <p className="rs-now">{all ? `전체 보기 · ${pages.length}개 씬` : `${pg + 1} / ${pages.length} 페이지 · ${pageTitle(pages[pg])}`}</p>
      <div className="rs-body" ref={bodyRef}>
        {(all ? pages.flat() : pages[pg]).map((x, i) => {
          if (x.t === 'chapter') return <h3 key={i} className="rs-chapter">{x.text}</h3>
          if (x.t === 'sub') return <p key={i} className="rs-sub">{x.text}</p>
          if (x.t === 'scene') return <h4 key={i} className="rs-scene">{x.text}</h4>
          if (x.t === 'cue') return hideCue ? null : <p key={i} className="rs-cue-line">{x.text}</p>
          if (x.t === 'note') return <p key={i} className="rs-note">{x.text}</p>
          const hit = x.who.find((w) => mine.includes(w))
          return (
            <p key={i} className={`rs-line${hit ? ' mine' : ''}`} style={hit ? { '--hl': colorOf(hit) } : undefined}>
              <b>{x.label}</b>
              <span>{x.text.split(/(\([^)]*\))/).map((t, j) => (t.startsWith('(') ? <i key={j} className="rs-dir">{t}</i> : t))}</span>
            </p>
          )
        })}
      </div>
      {nav}
    </div>
  )
}

function Cast() {
  return (
    <div className="cast">
      {cast.map((c) => (
        <div key={c.act} className="cast-act">
          <h3>{c.act}</h3>
          <ul>
            {c.members.map((m) => (
              <li key={m.role}>
                <span className="role">{m.role}{m.en && <small>{m.en}</small>}</span>
                <b>{m.name}</b>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// 테스트 섹션은 주소 끝에 ?test 를 붙였을 때만 보입니다. (예: 2026seal.web.app/?test)
const showTest = new URLSearchParams(window.location.search).has('test')

export default function App() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 300)
    window.addEventListener('scroll', on)
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <>
      <header className="top">
        <div className="top-inner">
        <a href="#top" className="logo">2026 성극</a>
        <nav>
          {menu.map((m) => <a key={m.id} href={`#${m.id}`}>{m.label}</a>)}
        </nav>
        <span />
        </div>
      </header>

      <div id="top" className="hero" style={{ '--hero': `url(${event.heroImage})` }}>
        <div className="hero-inner">
          <p className="eyebrow">2026 성탄전야</p>
          <h1>{event.title}</h1>
          <a className="btn" href="#schedule">일정 보기</a>
        </div>
      </div>

      <main>
        <Section id="schedule" no="01" en="SCHEDULE" ko="연습 및 공연 일정" tone="cream" note="연습 일정은 상황에 따라 변경·추가될 수 있습니다. 변경되면 바로 알려드릴게요."><Schedule /></Section>
        <Section id="script" no="02" en="SCRIPT" ko="대본 (1~4막)" tone="sand"><Script /></Section>
        <Section id="cast" no="03" en="CAST" ko="배역과 배우" tone="white" note="(직분생략)"><Cast /></Section>
        {showTest && <Section id="test" no="04" en="TEST" ko="대본 배역 강조 (테스트 · 1막 v1.1)" tone="sand" note="내 배역을 고르면 해당 대사에 색이 칠해집니다. 테스트용 화면입니다."><RoleScript /></Section>}
      </main>

      <footer>© 2026 ALL RIGHTS RESERVED.</footer>
      {scrolled && <a className="to-top" href="#top" aria-label="맨 위로">↑</a>}
    </>
  )
}
