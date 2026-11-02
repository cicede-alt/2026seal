import { useEffect, useState } from 'react'
import { event } from './data/event.js'
import { schedule } from './data/schedule.js'
import { acts } from './data/script.js'
import './App.css'

const menu = [
  { id: 'schedule', label: '일정' },
  { id: 'script', label: '대본' },
]

function Section({ id, no, en, ko, note, children }) {
  return (
    <section id={id} className="section">
      <p className="eyebrow">{no} {en}</p>
      <div className="sec-head">
        <h2>{ko}</h2>
        {note && <p className="sec-note">{note}</p>}
      </div>
      {children}
    </section>
  )
}

function Schedule() {
  return (
    <ul className="cards">
      {schedule.map((s) => {
        const d = new Date(s.date)
        return (
          <li key={s.date + s.title} className="card">
            <div className="day">
              <span>{d.getMonth() + 1}월</span>
              <strong>{d.getDate()}</strong>
              <span>{'일월화수목금토'[d.getDay()]}요일</span>
            </div>
            <div>
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
  const act = acts.find((a) => a.id === actId)
  return (
    <>
      <div className="tabs">
        {acts.map((a) => (
          <button key={a.id} className={a.id === actId ? 'on' : ''} onClick={() => setActId(a.id)}>
            {a.title}
          </button>
        ))}
      </div>
      {act.docUrl ? (
        <iframe className="doc" src={act.docUrl} title={act.title} />
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
    </>
  )
}

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
        <Section id="schedule" no="01" en="SCHEDULE" ko="연습 및 공연 일정" note="연습 일정은 상황에 따라 변경·추가될 수 있습니다. 변경되면 바로 알려드릴게요."><Schedule /></Section>
        <Section id="script" no="02" en="SCRIPT" ko="대본 (1~4막)"><Script /></Section>
      </main>

      <footer>© 2026 ALL RIGHTS RESERVED.</footer>
      {scrolled && <a className="to-top" href="#top" aria-label="맨 위로">↑</a>}
    </>
  )
}
