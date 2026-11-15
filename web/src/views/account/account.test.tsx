import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { StrictMode } from 'react'
import App from '../../App'
import { PREFERENCES_KEY } from '../welcome/preferences'
import { addFavorite, renameFavorite } from './favorites'

const $ = (sel: string) => document.querySelector(sel) as HTMLElement
const click = (sel: string) => act(() => { fireEvent.click($(sel)) })
const type = (sel: string, value: string) => act(() => { fireEvent.change($(sel), { target: { value } }) })

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); window.AuthService?.logout() })
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.documentElement.removeAttribute('data-fontsize') })

function mount() { return render(<StrictMode><App /></StrictMode>) }

describe('계정 탭', () => {
  it('실제 로그인 연결 실패는 화면에 안내하고 버튼을 다시 사용할 수 있다', async () => {
    vi.spyOn(window.AuthService, 'login').mockRejectedValue(new Error('로그인 저장소가 아직 준비되지 않았어요.'))
    mount()
    click('[data-provider="google"]')
    expect(($('[data-provider="google"]') as HTMLButtonElement).disabled).toBe(true)
    await act(async () => { await Promise.resolve() })
    expect(document.querySelector('#authGuest [role="alert"]')?.textContent).toContain('로그인 저장소가 아직 준비되지 않았어요.')
    expect(($('[data-provider="google"]') as HTMLButtonElement).disabled).toBe(false)
    expect($('#authGuest').hidden).toBe(false)
  })
  it('비로그인 → 로그인 → 마이페이지에는 즐겨찾기 섹션이 없고 저장 데이터는 유지 → 로그아웃 (#128)', async () => {
    mount()
    expect($('#authGuest').hidden).toBe(false)
    expect($('#authUser').hidden).toBe(true)
    click('[data-provider="google"]')
    expect($('#authUser').hidden).toBe(false)
    expect($('.tab[data-tab="login"]').textContent).toContain('마이페이지')
    // 마이페이지에서 즐겨찾기 섹션을 제거했다
    expect(document.getElementById('favSection')).toBeNull()
    expect(document.getElementById('favList')).toBeNull()
    expect(document.getElementById('favAddBtn')).toBeNull()
    // 즐겨찾기 데이터 저장소는 그대로 동작한다 (노선도·역 상세가 쓰는 데이터)
    await act(async () => { await addFavorite('코엑스') })
    const stored = JSON.parse(sessionStorage.getItem('elevSubway.demoFavorites.v1')!)
    expect(stored[0]).toMatchObject({ placeName: '코엑스', alias: '' })
    await act(async () => { await renameFavorite(stored[0].id, '우리집') })
    expect(JSON.parse(sessionStorage.getItem('elevSubway.demoFavorites.v1')!)[0]).toMatchObject({ alias: '우리집' })

    click('#editNameBtn')
    type('#nameEditInput', '새 사용자')
    click('#nameEditConfirm')
    expect($('#authProfileName').textContent).toBe('새 사용자')
    expect($('#authProfileAvatar').textContent).toBe('새')

    click('[data-auth="signout"]')
    await act(async () => { await Promise.resolve() })
    expect($('#authGuest').hidden).toBe(false)
    expect(JSON.parse(sessionStorage.getItem('elevSubway.demoFavorites.v1')!)).toEqual([])
    expect($('.tab[data-tab="login"]').textContent).toContain('로그인')
  })

  it('쉬운 화면 전환 버튼은 마이페이지 헤더 왼쪽에만 있고 다른 탭에는 없다 (#134)', () => {
    mount()
    click('[data-provider="google"]')
    const btn = document.getElementById('mypageEasyBtn')
    expect(btn).not.toBeNull()
    expect(btn?.textContent).toContain('쉬운 화면')
    // 글자 오른쪽 끝에 원형 화살표가 함께 묶여 있다 (#142)
    expect(btn?.querySelector('.mypage-easy-circle')?.lastElementChild).not.toBeNull()
    expect(btn?.lastElementChild?.classList.contains('mypage-easy-circle')).toBe(true)
    // 제목 오른쪽에 있다 (사용자 요청: 마이페이지 헤더 우측)
    const title = document.querySelector('#view-login .mypage-header h2') as HTMLElement
    expect(title.compareDocumentPosition(btn!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // 마이페이지 밖의 탭 어디에도 이 버튼이나 같은 문구의 버튼이 없다
    act(() => { window.App!.switchTab('map') })
    for (const tab of ['map', 'elevator', 'time', 'chat']) {
      act(() => { window.App!.switchTab(tab) })
      const outside = [...document.querySelectorAll('.view button')].filter((b) => !b.closest('#view-login'))
      expect(outside.some((b) => /쉬운 화면/.test(b.textContent || '')), tab).toBe(false)
      expect(document.getElementById('mypageEasyBtn')?.closest(`#view-${tab}`) ?? null, tab).toBeNull()
    }
  })

  it('글자 크기 칩이 html[data-fontsize]와 저장소를 바꾼다', () => {
    mount()
    click('.fontsize-chip[data-fontsize="xl"]')
    expect(document.documentElement.getAttribute('data-fontsize')).toBe('xl')
    expect(localStorage.getItem('elevSubway.fontSize.v1')).toBe('xl')
    expect($('.fontsize-chip[data-fontsize="xl"]').getAttribute('aria-pressed')).toBe('true')
    click('.fontsize-chip[data-fontsize="normal"]')
    expect(document.documentElement.hasAttribute('data-fontsize')).toBe(false)
  })
  it('마이페이지의 쉬운 화면 버튼은 설정을 바꾸지 않고 #/easy로 이동하며 로그인을 유지한다', async () => {
    const saved = JSON.stringify({ version: 1, font: 'xl', contrast: false, simple: false, touch: false, motion: false, stepFree: false })
    localStorage.setItem(PREFERENCES_KEY, saved)
    localStorage.setItem('elevSubway.fontSize.v1', 'xl')
    window.history.replaceState(null, '', '/#/main')
    mount()
    click('[data-provider="google"]')
    await act(async () => { await Promise.resolve() })
    const button = $('#mypageEasyBtn')
    expect(button.tagName).toBe('BUTTON')
    expect(button.textContent).toContain('쉬운 화면')
    expect($('#authUser .view-title').textContent).toBe('마이페이지')
    click('#mypageEasyBtn')
    expect(window.location.hash).toBe('#/easy')
    expect(window.AuthService.getSession()).toBeTruthy()
    expect(localStorage.getItem(PREFERENCES_KEY)).toBe(saved)
    expect(localStorage.getItem('elevSubway.fontSize.v1')).toBe('xl')
  })

  it('저장된 설정이 없어도 쉬운 화면 이동은 설정 저장소와 글자 크기를 바꾸지 않는다', async () => {
    localStorage.setItem('elevSubway.fontSize.v1', 'xl')
    window.history.replaceState(null, '', '/#/main')
    mount()
    click('[data-provider="google"]')
    await act(async () => { await Promise.resolve() })
    click('#mypageEasyBtn')
    expect(window.location.hash).toBe('#/easy')
    expect(localStorage.getItem(PREFERENCES_KEY)).toBeNull()
    expect(localStorage.getItem('elevSubway.fontSize.v1')).toBe('xl')
    expect(window.AuthService.getSession()).toBeTruthy()
  })
})
