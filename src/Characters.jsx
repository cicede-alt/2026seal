import { useEffect, useRef, useState } from 'react'
import './admin.css'

// 등장인물 이미지컷 문서 (구글 문서 '링크가 있는 모든 사용자 – 뷰어' 로 공유되어 있어야 보입니다.)
const DOC = 'https://docs.google.com/document/d/1ZJ_hQM_3qP2N4KspCkHokTJv7iUurqQfR1ek3jU7HYs'
// 문서 안 이미지가 좁은 화면에서 잘리지 않도록, 이 폭으로 그린 뒤 화면 폭에 맞게 줄여서 보여줍니다.
const BASE = 760

// /characters : 등장인물 이미지컷을 크게 보여주는 화면
export default function Characters() {
  const box = useRef(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(1, box.current.clientWidth / BASE))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  const h = `calc(100vh - 150px)`
  return (
    <div className="adm pub chars">
      <header className="adm-top">
        <h1>등장인물 이미지컷</h1>
        <div><a href="/#cast">← 출연진으로</a></div>
      </header>
      <div className="chars-box" ref={box} style={{ height: h, minHeight: 480 }}>
        <iframe
          className="chars-doc"
          title="등장인물 이미지컷"
          src={`${DOC}/mobilebasic?tab=t.0`}
          style={{ width: BASE, height: `calc((100vh - 150px) / ${scale})`, minHeight: 480 / scale, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  )
}

