import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase 콘솔 > 프로젝트 설정 > 내 앱 > 웹 앱 의 firebaseConfig 값을 붙여 넣으세요.
// (이 값은 비밀이 아닙니다. 접근 제어는 firestore.rules 와 로그인으로 합니다.)
export const firebaseConfig = {
  apiKey: 'AIzaSyAomunt-WJ4lY5ASQmLNuCa_R8YoSyLYtI',
  authDomain: 'seal-aadba.firebaseapp.com',
  projectId: 'seal-aadba',
  appId: '1:1054898301774:web:56b8b7e42b42ab2b8f4c1f',
}

export const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.appId)
const app = configured ? initializeApp(firebaseConfig) : null
export const auth = app && getAuth(app)
export const db = app && getFirestore(app)

// 로그인 화면은 '아이디'를 받습니다. 이메일(@ 포함)이면 그대로, 아니면 `아이디@seal.local` 로 씁니다.
export const toEmail = (id) => {
  const v = id.trim().toLowerCase()
  return v.includes('@') ? v : `${v}@seal.local`
}
