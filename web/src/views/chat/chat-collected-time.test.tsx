import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../../App'
import { responseSpeechText } from './responseSpeechText'

class Utterance {
  lang = ''; voice = null; onend = null; onerror = null
  constructor(public text: string) {}
}
let synth: EventTarget & { speak: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> }
const input = () => document.querySelector<HTMLInputElement>('#chatInput')!
function submit(text = '강남역 엘리베이터 돼?') {
  fireEvent.change(input(), { target: { value: text } })
  fireEvent.submit(document.querySelector('#chatForm')!)
}
function open() {
  render(<App />)
  act(() => window.App.switchTab('chat'))
}
/** 가장 최근 답변 말풍선(봇). 환영 메시지는 앞에 있다. */
function answerBubble(): HTMLElement {
  const bubbles = document.querySelectorAll<HTMLElement>('.msg.bot .bubble-answer')
  const bubble = bubbles.item(bubbles.length - 1)
  if (!bubble) throw new Error('bot answer bubble not found')
  return bubble
}

beforeEach(() => {
  synth = Object.assign(new EventTarget(), {
    speak: vi.fn(), cancel: vi.fn(),
    getVoices: () => [{ lang: 'ko-KR', localService: true }],
  })
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
})
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear()
  document.body.removeAttribute('data-active-tab')
})

describe('답변 말풍선의 수집 시각 (#159)', () => {
  it('+09:00 값을 KST 표기로 말풍선 안에 보여준다', async () => {
    vi.spyOn(window.AIAgent, 'processMessage').mockResolvedValue({
      text: '강남역 엘리베이터는 정상이에요.', dataUpdatedAt: '2026-11-15T19:13:00+09:00',
    })
    open(); submit()
    expect(await screen.findByText('2026.11.15 19:13 수집')).toBeTruthy()
    expect(answerBubble().contains(screen.getByText('2026.11.15 19:13 수집'))).toBe(true)
    expect(answerBubble().textContent).toContain('강남역 엘리베이터는 정상이에요.')
  })

  it('Z 값도 KST(19:13)로 보여준다', async () => {
    vi.spyOn(window.AIAgent, 'processMessage').mockResolvedValue({
      text: '답변', dataUpdatedAt: '2026-11-15T10:13:00Z',
    })
    open(); submit()
    expect(await screen.findByText('2026.11.15 19:13 수집')).toBeTruthy()
  })

  it('값이 null이면 수집 시각 문구를 아무것도 그리지 않는다', async () => {
    vi.spyOn(window.AIAgent, 'processMessage').mockResolvedValue({ text: '경로 안내예요.', dataUpdatedAt: null })
    open(); submit()
    await waitFor(() => expect(answerBubble().textContent).toContain('경로 안내예요.'))
    expect(document.querySelector('.answer-collected')).toBeNull()
    expect(document.body.textContent).not.toContain('수집 시각')
    expect(document.body.textContent).not.toMatch(/2026\.11\.15/)
  })

  it('사용자 말풍선에는 수집 표기가 없다', async () => {
    vi.spyOn(window.AIAgent, 'processMessage').mockResolvedValue({ text: '답변', dataUpdatedAt: '2026-11-15T19:13:00+09:00' })
    open(); submit('강남역 엘리베이터 상황 알려줘')
    await screen.findByText('2026.11.15 19:13 수집')
    const user = document.querySelector('.msg.user')!
    expect(user.textContent).toContain('강남역 엘리베이터 상황 알려줘')
    expect(user.textContent).not.toContain('수집')
    expect(user.querySelector('.answer-collected')).toBeNull()
  })

  it('음성 텍스트(TTS)에는 답변 본문만 들어가고 수집 시각과 표기는 빠진다', async () => {
    vi.spyOn(window.AIAgent, 'processMessage').mockResolvedValue({
      text: '강남역 엘리베이터는 정상이에요.', dataUpdatedAt: '2026-11-15T19:13:00+09:00',
    })
    open(); submit()
    await screen.findByText('2026.11.15 19:13 수집')
    fireEvent.click(screen.getAllByRole('button', { name: '답변 듣기' }).at(-1)!)
    expect(synth.speak).toHaveBeenCalledOnce()
    const spoken = synth.speak.mock.calls[0][0].text as string
    expect(spoken).toBe('강남역 엘리베이터는 정상이에요.')
    expect(spoken).not.toContain('수집')
    expect(spoken).not.toMatch(/2026|19:13|오후/)
  })

  it('responseSpeechText는 수집 시각 필드를 읽지 않는다', () => {
    expect(responseSpeechText({ text: '본문이에요.', dataUpdatedAt: '2026-11-15T19:13:00+09:00' })).toBe('본문이에요.')
  })
})
