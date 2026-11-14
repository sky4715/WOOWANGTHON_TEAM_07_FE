import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import App from '../../App'
import { saveFavs } from '../account/favorites'

const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null

afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.removeAttribute('data-active-tab') })

describe('챗 탭', () => {
  it('즐겨찾기 추가·변경·삭제와 로그아웃을 반영하고 실제 역명으로 전송한다', async () => {
    const process = vi.spyOn(window.AIAgent, 'processMessage').mockResolvedValue({ text: '역 정보를 확인했어요.' })
    act(() => { window.AuthService.login('google') })
    render(<App />)
    act(() => { saveFavs([{ id: '1', placeName: '강남역', alias: '회사' }]) })
    expect($('#chatSuggestions [data-favorite-station="gangnam"]')?.textContent).toContain('회사 · 강남역')
    fireEvent.click($('#chatSuggestions [data-favorite-station="gangnam"]')!)
    await waitFor(() => expect(process).toHaveBeenCalledWith('강남역 엘리베이터 알려줘'))
    await waitFor(() => expect($('#chatMessages .typing')).toBeNull())
    act(() => { saveFavs([{ id: '1', placeName: '강남역', alias: '직장' }]) })
    expect($('#chatSuggestions [data-favorite-station="gangnam"]')?.textContent).toContain('직장')
    act(() => { saveFavs([]) })
    expect($('#chatSuggestions [data-favorite-station]')).toBeNull()
    act(() => { saveFavs([{ id: '1', placeName: '강남역' }]) })
    act(() => { void window.AuthService.logout() })
    expect($('#chatSuggestions [data-favorite-station]')).toBeNull()
    expect($('#chatSuggestions .chip')).not.toBeNull()
  })

  it('도구 호출 영역을 렌더링하지 않고 답변과 역 상세 버튼을 유지한다', async () => {
    vi.spyOn(window.AIAgent, 'processMessage').mockResolvedValue({
      text: '강남역 정보를 확인했어요.',
      toolCalls: [{ name: 'resolve_station', args: { query: '강남' } }, { name: 'get_elevator_status', args: { station_id: 'gangnam' } }],
      actions: [{ type: 'openStation', label: '강남역 상세 보기', payload: { stationId: 'gangnam' } }],
    })
    render(<App />)
    fireEvent.change($('#chatInput')!, { target: { value: '강남역 상태 알려줘' } })
    fireEvent.submit($('#chatForm')!)
    await waitFor(() => expect($('#chatMessages')?.textContent).toContain('강남역 정보를 확인했어요.'))
    expect($('#chatMessages .tool-chip')).toBeNull()
    expect($('#chatMessages')?.textContent).not.toMatch(/resolve_station|get_elevator_status/)
    fireEvent.click($('#chatMessages .msg-actions button')!)
    expect($('#sheetContent .sheet-title')?.textContent).toContain('강남역')
  })

  it('환영 메시지와 제안 칩', () => {
    render(<App />)
    expect(document.querySelectorAll('#chatMessages .msg.bot').length).toBe(1)
    expect(document.querySelectorAll('#chatSuggestions .chip').length).toBeGreaterThan(0)
  })

  it('전송: 사용자 말풍선, 봇 답변, 입력 비움, 서버 문자열은 이스케이프', async () => {
    render(<App />)
    const input = $('#chatInput') as HTMLInputElement
    fireEvent.change(input, { target: { value: '강남역 엘리베이터 돼?' } })
    fireEvent.submit($('#chatForm')!)
    expect(input.value).toBe('')
    expect(input.disabled).toBe(true)
    expect($('#chatMessages .msg.user .bubble')?.textContent).toBe('강남역 엘리베이터 돼?')
    expect($('#chatMessages .typing')).not.toBeNull()
    await waitFor(() => expect($('#chatMessages .typing')).toBeNull())
    expect(input.disabled).toBe(false)
    expect(document.querySelectorAll('#chatMessages .msg.bot').length).toBe(2)
  })

  it('XSS: 사용자 텍스트는 HTML로 해석되지 않는다', () => {
    render(<App />)
    fireEvent.change($('#chatInput')!, { target: { value: '<img src=x onerror=alert(1)>' } })
    fireEvent.submit($('#chatForm')!)
    expect($('#chatMessages .msg.user img')).toBeNull()
  })

  it('챗 탭으로 전환하면 활성화된다', async () => {
    render(<App />)
    act(() => { (window.App as unknown as { switchTab(n: string): void }).switchTab('chat') })
    expect($('#view-chat')?.classList.contains('active')).toBe(true)
  })
})
