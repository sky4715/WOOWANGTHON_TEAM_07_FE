import { useEffect, useRef, useState } from 'react'
import { IeumLogo } from '../../components/IeumLogo'
import App from '../../App'
import { TABS, type TabName } from '../../app/context'
import { readFontSize } from '../account/favorites'
import { applyPreferences, defaultPreferences, readPreferences, savePreferences, type Preferences } from './preferences'
import './welcome.css'

const tasks: { tab: TabName; number: string; title: string; description: string }[] = [
  { tab: 'elevator', number: '01', title: '엘리베이터 확인', description: '이용할 역의 설비 상태를 확인해요' },
  { tab: 'time', number: '02', title: '출발 시각 계산', description: '출발역과 도착역을 선택해요' },
  { tab: 'map', number: '03', title: '지하철 노선도', description: '노선과 역을 찾아봐요' },
  { tab: 'chat', number: '04', title: '궁금한 점 물어보기', description: '글로 질문하고 답변을 읽어요' },
]
const fontOptions = [['normal', '보통'], ['lg', '크게'], ['xl', '아주 크게'], ['max', '최대']] as const
const options = [
  { key: 'simple', title: '간단한 첫 화면', description: '지도 대신 큰 기능 버튼으로 시작해요.' },
  { key: 'contrast', title: '높은 대비', description: '글자와 배경, 테두리를 또렷하게 해요.' },
  { key: 'touch', title: '큰 버튼', description: '버튼과 입력칸을 더 누르기 쉽게 해요.' },
  { key: 'motion', title: '움직임 줄이기', description: '화면 전환과 반복되는 움직임을 줄여요.' },
  { key: 'stepFree', title: '계단 이용 도움', description: '엘리베이터 확인을 먼저 안내해요.' },
] as const

function readRoute() {
  const path = window.location.hash.slice(1)
  if (path === '/main' || path === '/easy' || path === '/customize') return path
  if (path.startsWith('/easy/') && TABS.includes(path.slice(6) as TabName)) return path
  return '/'
}
function modePreferences(easy: boolean): Preferences {
  return { ...defaultPreferences(), font: easy ? 'lg' : 'normal', simple: easy, touch: easy, motion: easy }
}
// 저장된 설정이 없을 때도 글자 크기는 이 브라우저에 기록된 값을 그대로 쓴다(모드 기본값으로 덮어쓰지 않는다).
function unsavedModePreferences(easy: boolean): Preferences {
  return { ...modePreferences(easy), font: readFontSize() }
}
// 마이페이지의 "쉬운 화면으로 이동" 뒤 뒤로 가기로 돌아온 노선도 entry는 로그인 탭을 기억한다.
function mainTabFromHistory(): TabName {
  const state = window.history.state as { tab?: unknown } | null
  return state && typeof state === 'object' && state.tab === 'login' ? 'login' : 'map'
}

export default function Welcome() {
  const [route, setRoute] = useState(readRoute)
  const [appStarted, setAppStarted] = useState(() => route === '/main' || route.startsWith('/easy/'))
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState(readPreferences)
  const [draft, setDraft] = useState<Preferences>(() => selected || modePreferences(true))
  const heading = useRef<HTMLHeadingElement>(null)
  const landing = route === '/'
  const easyHome = route === '/easy'
  const customize = route === '/customize'
  const showApp = !landing && !easyHome && !customize
  const easy = route.startsWith('/easy')

  useEffect(() => {
    const sync = () => {
      const next = readRoute()
      if (next === '/main' || next.startsWith('/easy/')) setAppStarted(true)
      setRoute(next)
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  useEffect(() => {
    // 루트 접속에서는 저장값으로 랜딩을 건너뛰지 않는다.
    applyPreferences(customize ? draft : landing ? modePreferences(false) : selected || unsavedModePreferences(easy))
  }, [easy, customize, draft, selected, landing])
  useEffect(() => {
    if (showApp) {
      const tab = route === '/main' ? mainTabFromHistory() : route.slice(6)
      const switchTab = window.App?.switchTab
      if (typeof switchTab === 'function') switchTab(tab)
      document.querySelector<HTMLElement>('#phone .tab.active')?.focus()
    } else heading.current?.focus()
  }, [route, showApp])

  const navigate = (next: string) => {
    if (next === '/main' || next.startsWith('/easy/')) setAppStarted(true)
    setRoute(next)
    window.location.hash = next
  }
  // 화면을 고르면 한 번만 이동한다(연타해도 저장·이동은 한 번). 화면이 바뀌면 다시 풀린다.
  const startedRef = useRef(false)
  useEffect(() => { startedRef.current = false }, [route])
  const start = (value: Preferences) => {
    if (startedRef.current) return
    startedRef.current = true
    const stored = savePreferences(value)
    setSelected(value)
    setDraft(value)
    setNotice(stored ? '' : '선택한 화면으로 이용할 수 있어요. 이 브라우저에는 설정이 저장되지 않아요.')
    navigate(value.simple || value.stepFree ? '/easy' : '/main')
  }
  const choose = (simple: boolean) => start(simple ? draft : modePreferences(false))
  // 쉬운 화면: 이미 쉬운 설정을 저장했다면 그 값을 쓰고, 아니면 쉬운 화면 기본 설정(큰 글씨·큰 버튼·움직임 줄이기)을 적용한다.
  const chooseEasy = () => start(selected && (selected.simple || selected.stepFree) ? selected : modePreferences(true))

  return <>
    <div className="welcome-app" hidden={!showApp}>
      {appStarted && <App welcomeControl={easy ? <nav className="easy-navigation" aria-label="쉬운 화면 탐색"><span>쉬운 화면</span><a href="#/easy" onClick={(event) => { event.preventDefault(); navigate('/easy') }}>쉬운 화면 홈</a></nav> : undefined} />}
      {showApp && notice && <p className="access-notice" role="status">{notice}</p>}
    </div>
    {landing && <div className="welcome-shell ieum-landing" data-page="landing">
      <main className="ieum-landing-main">
        <div className="ieum-landing-group">
          <h1 className="ieum-landing-logo" ref={heading} tabIndex={-1}><IeumLogo /></h1>
          <div className="ieum-mode-choices" role="group" aria-label="이용할 화면 선택">
            <button className="ieum-mode-btn ieum-mode-basic" type="button" onClick={() => choose(false)}>기본 화면</button>
            <button className="ieum-mode-btn ieum-mode-easy" type="button" onClick={chooseEasy}>쉬운 화면</button>
          </div>
        </div>
      </main>
    </div>}
    {customize && <div className="welcome-shell" data-page="customize">
      <main className="customize-main">
        <header className="customize-header">
          <button className="customize-back" type="button" aria-label="쉬운 화면으로 돌아가기" onClick={() => navigate('/easy')}><span aria-hidden="true">←</span></button>
          <h1 ref={heading} tabIndex={-1}>화면 맞춤 설정</h1>
        </header>
        <p className="welcome-lead">필요한 도움을 골라주세요. 여러 개를 함께 선택해도 괜찮아요.</p>
        <form onSubmit={(event) => { event.preventDefault(); choose(true) }}>
          <fieldset className="customize-card"><legend>읽기 편한 글자 크기</legend><div className="customize-fonts">{fontOptions.map(([value, label]) => <label key={value}><input type="radio" name="font" checked={draft.font === value} onChange={() => setDraft({ ...draft, font: value })}/><span>{label}</span></label>)}</div></fieldset>
          <fieldset className="customize-card"><legend className="customize-legend-help">필요한 도움이 무엇인가요?</legend><p className="customize-help-text">필요한 도움을 여러 개 선택할 수 있어요.</p><div className="customize-options">{options.map((option) => <label key={option.key}><input type="checkbox" checked={draft[option.key]} onChange={(event) => setDraft({ ...draft, [option.key]: event.target.checked })}/><span><strong>{option.title}</strong><span>{option.description}</span></span></label>)}</div></fieldset>
          <p className="welcome-hint">선택한 설정은 이 브라우저에만 저장해요. 나이나 장애 정보는 입력하지 않아요.</p>
          <button className="customize-submit" type="submit">이 설정으로 시작하기 →</button>
        </form>
      </main>
    </div>}
    {easyHome && <div className="easy-main-shell" data-page="easy-main">
      <main className="easy-main-content">
        <div className="easy-title-row">
          <button className="customize-back" type="button" aria-label="시작 화면으로 이동" onClick={() => navigate('/')}><span aria-hidden="true">←</span></button>
          <h1 ref={heading} tabIndex={-1}>무엇을 도와드릴까요?</h1>
        </div>
        <p className="welcome-lead">이용할 기능을 눌러주세요.</p>
        {notice && <p role="status">{notice}</p>}
        <div className="welcome-tasks">{tasks.map((task) => <button type="button" key={task.tab} onClick={() => navigate('/easy/' + task.tab)}><span className="welcome-number" aria-hidden="true">{task.number}</span><span><strong>{task.title}</strong><span>{task.description}</span></span><span aria-hidden="true">→</span></button>)}</div>
        <div className="easy-secondary-actions">
          <button className="easy-customize-action" type="button" onClick={() => navigate('/customize')}>화면 맞춤 설정</button>
        </div>
        <p className="easy-main-note">엘리베이터 상태만으로 전체 경로의 접근성을 보장하지 않아요. 출입구와 환승 구간도 확인해 주세요.</p>
      </main>
    </div>}
  </>
}
