// docUrl 이 있는 막은 구글 문서를 그대로 보여줍니다. 없으면 아래 lines 를 보여줍니다.
// 대본은 여기서 수정하세요. lines: { who: 배역, text: 대사 } 또는 { note: 지문 }
// version: 현재 최신 버전 / changes: 이번 버전 변경점(한 줄) / old: 이전 버전 목록 [{ version, docUrl }]
// 이전 버전 문서 주소를 old 에 넣으면 '이전 버전 보기' 링크가 나타납니다.
export const acts = [
  { id: 1, title: '1막', version: 'v1.1', changes: '(수정일 11/08) 11/07 리딩 후 중복 대사 제거 및 동선으로 인한 대사 추가 및 삭제', old: [{ version: 'v1.0', docUrl: 'https://docs.google.com/document/d/1cuRGdsQqqLF5RXYzwblH1ztmxQi6KkiI6xpyfF1SZ0E/preview?tab=t.0' }], docUrl: 'https://docs.google.com/document/d/10E71orJ1LpCB7PS-VoGObETb5HlI3FWVqCIudutywlg/preview?tab=t.0', lines: [{ note: '(막이 오르고 무대에 조명이 들어온다)' }, { who: '해설', text: '대사를 입력하세요.' }] },
  { id: 2, title: '2막', version: 'v1.0', docUrl: 'https://docs.google.com/document/d/1cZYIsHthowSbby2EuuDAKJ5ttIIrYeSbhIvDKoMxHvU/preview?tab=t.0', lines: [{ who: '해설', text: '대사를 입력하세요.' }] },
  { id: 3, title: '3막', version: 'v1.0', docUrl: 'https://docs.google.com/document/d/1sqsrglgUQi9XbIYq-Yhkdu4py_v2HwMESz9SeHc1l-Y/preview?tab=t.0', lines: [{ who: '해설', text: '대사를 입력하세요.' }] },
  { id: 4, title: '4막', version: 'v1.0', docUrl: 'https://docs.google.com/document/d/1SX5womURKXTAs3AZifyIVj9iBL-bIP23ZbZeTNMAC8s/preview?tab=t.0', lines: [{ who: '해설', text: '대사를 입력하세요.' }] },
]
