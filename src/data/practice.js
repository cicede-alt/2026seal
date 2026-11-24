import { useEffect, useState } from 'react'

/** 신청된 연습 시간표를 실시간으로 읽습니다. (필요할 때만 Firebase 를 불러옵니다.) */
export function usePractice() {
  const [slots, setSlots] = useState(null)
  useEffect(() => {
    let off = () => {}
    let dead = false
    Promise.all([import('./firebase.js'), import('firebase/firestore')]).then(([f, fs]) => {
      if (dead || !f.configured) return
      off = fs.onSnapshot(fs.collection(f.db, 'practice'), (snap) => {
        setSlots(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`)))
      }, () => setSlots([]))
    }).catch(() => {})
    return () => { dead = true; off() }
  }, [])
  return slots
}
