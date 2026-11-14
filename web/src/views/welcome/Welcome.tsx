import { useEffect, useRef, useState } from 'react'
import App from '../../App'
import { TABS, type TabName } from '../../app/context'
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
    applyPreferences(customize ? draft : landing ? modePreferences(false) : selected || modePreferences(easy))
  }, [easy, customize, draft, selected, landing])
  useEffect(() => {
    if (showApp) {
      const tab = route === '/main' ? 'map' : route.slice(6)
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
  const choose = (simple: boolean) => {
    const value = simple ? draft : modePreferences(false)
    const stored = savePreferences(value)
    setSelected(value)
    setNotice(stored ? '' : '선택한 화면으로 이용할 수 있어요. 이 브라우저에는 설정이 저장되지 않아요.')
    navigate(value.simple || value.stepFree ? '/easy' : '/main')
  }

  return <>
    <div className="welcome-app" hidden={!showApp}>
      {appStarted && <App welcomeControl={easy ? <nav className="easy-navigation" aria-label="쉬운 화면 탐색"><span>쉬운 화면</span><a href="#/easy" onClick={(event) => { event.preventDefault(); navigate('/easy') }}>쉬운 화면 홈</a></nav> : undefined} />}
      {showApp && notice && <p className="access-notice" role="status">{notice}</p>}
    </div>
    {landing && <div className="welcome-shell" data-page="landing">
      <main className="welcome-main">
        <section className="welcome-intro">
          <h1 className="landing-logo" ref={heading} tabIndex={-1}>
            <span className="landing-logo-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="10" y="14" width="28" height="29" rx="5"/><path d="M24 15v27M16 8l4-4 4 4m0 0 4 4 4-4M17 27v6m14-6v6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            엘리베이터 지하철
          </h1>
          <p className="welcome-lead">모두의 편안한 이동</p>
          <div className="mode-choices" aria-label="이용할 화면 선택">
            <button className="mode-choice mode-choice-basic" type="button" onClick={() => choose(false)}>
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m4 7 8-3 8 4 8-3v22l-8 3-8-4-8 3zM12 4v22M20 8v22" strokeLinejoin="round"/></svg>
              <strong>기본 화면으로 시작</strong><span>지하철 노선도를 중심으로<br />역과 이동 정보를 살펴봐요.</span><span className="mode-choice-action" aria-hidden="true">기본 화면 들어가기 →</span>
            </button>
            <button className="mode-choice mode-choice-custom" type="button" onClick={() => { setDraft(selected || modePreferences(true)); navigate('/customize') }}>
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 10h24M4 23h24M12 5v10m9 3v10" strokeLinecap="round"/></svg>
              <strong>나에게 맞게 시작</strong><span>글자 크기와 버튼, 대비를<br />나에게 편하게 맞춰요.</span><span className="mode-choice-action" aria-hidden="true">맞춤 화면 만들기 →</span>
            </button>
          </div>
          <p className="welcome-hint">두 화면 모두 로그인 없이 이용할 수 있어요.</p>
        </section>
      </main>
      <footer className="welcome-footer">서울 지하철 1–8호선 · 엘리베이터 상태 확인과 출발 시각 안내</footer>
    </div>}
    {customize && <div className="welcome-shell" data-page="customize">
      <main className="customize-main">
        <a className="customize-back" href="#/" onClick={(event) => { event.preventDefault(); navigate('/') }}>← 시작 화면으로</a>
        <h1 ref={heading} tabIndex={-1}>나에게 편한 화면 만들기</h1>
        <p className="welcome-lead">필요한 도움을 골라주세요. 여러 개를 함께 선택해도 괜찮아요.</p>
        <form onSubmit={(event) => { event.preventDefault(); choose(true) }}>
          <fieldset><legend>읽기 편한 글자 크기</legend><div className="customize-fonts">{fontOptions.map(([value, label]) => <label key={value}><input type="radio" name="font" checked={draft.font === value} onChange={() => setDraft({ ...draft, font: value })}/><span>{label}</span></label>)}</div><p className="customize-sample">이 글씨가 편하게 보이시나요?</p></fieldset>
          <fieldset><legend>필요한 도움</legend><div className="customize-options">{options.map((option) => <label key={option.key}><input type="checkbox" checked={draft[option.key]} onChange={(event) => setDraft({ ...draft, [option.key]: event.target.checked })}/><span><strong>{option.title}</strong><span>{option.description}</span></span></label>)}</div></fieldset>
          <p className="welcome-hint">선택한 설정은 이 브라우저에만 저장해요. 나이나 장애 정보는 입력하지 않아요.</p>
          <button className="customize-submit" type="submit">이 설정으로 시작하기 →</button>
        </form>
      </main>
    </div>}
    {easyHome && <div className="easy-main-shell" data-page="easy-main">
      <header className="easy-main-header"><span className="welcome-brand">엘리베이터 지하철 <span className="easy-mode-badge">쉬운 화면</span></span><a href="#/" onClick={(event) => { event.preventDefault(); navigate('/') }}>화면 다시 선택</a></header>
      <main className="easy-main-content">
        <h1 ref={heading} tabIndex={-1}>무엇을 도와드릴까요?</h1>
        <p className="welcome-lead">이용할 기능을 눌러주세요.</p>
        {notice && <p role="status">{notice}</p>}
        <div className="welcome-tasks">{tasks.map((task) => <button type="button" key={task.tab} onClick={() => navigate('/easy/' + task.tab)}><span className="welcome-number" aria-hidden="true">{task.number}</span><span><strong>{task.title}</strong><span>{task.description}</span></span><span aria-hidden="true">→</span></button>)}</div>
        <p className="easy-main-note">엘리베이터 상태만으로 전체 경로의 접근성을 보장하지 않아요. 출입구와 환승 구간도 확인해 주세요.</p>
      </main>
    </div>}
  </>
}
