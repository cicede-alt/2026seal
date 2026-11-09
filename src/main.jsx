import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// 관리자·소품 화면은 해당 주소에서만 불러옵니다. (메인 화면 로딩을 가볍게 유지)
const Admin = lazy(() => import('./Admin.jsx'))
const Props = lazy(() => import('./Props.jsx'))

// 주소별 화면: /admin(관리자), /props(소품 목록), 그 외는 메인
const path = () => location.pathname.replace(/\/+$/, '')
function Root() {
  const p = path()
  if (p === '/admin') return <Suspense fallback={null}><Admin /></Suspense>
  if (p === '/props') return <Suspense fallback={null}><Props /></Suspense>
  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
