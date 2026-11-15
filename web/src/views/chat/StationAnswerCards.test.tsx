import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, within } from '@testing-library/react'
import App from '../../App'
import { StationAnswerCards } from './StationAnswerCards'
import { buildStationCards, CARD_STATUS, type CardStatus, type StationCardData } from './stationCards'

const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null

afterEach(() => { cleanup(); vi.restoreAllMocks() })

function card(over: Partial<StationCardData> = {}): StationCardData {
  return { stationId: 'gangnam', name: '강남역', lines: ['2'], status: 'AVAILABLE', description: '엘리베이터 3대 중 3대 정상 운행', ...over }
}

describe('역 정보 카드 컴포넌트', () => {
  it.each([
    ['AVAILABLE', '정상', 'check_circle', 'ok'],
    ['PARTIAL', '일부 운행', 'error', 'warn'],
    ['UNAVAILABLE', '이용 불가', 'cancel', 'bad'],
    ['UNKNOWN', '확인 필요', 'help', 'unknown'],
  ] as Array<[CardStatus, string, string, string]>)('%s는 글자 "%s"와 아이콘 %s로 보인다', (status, label, icon, cls) => {
    render(<StationAnswerCards cards={[card({ status })]} onOpenStation={() => {}} />)
    const pill = $('.station-card-status')!
    // 아이콘 글자(ligature)는 화면 읽기에서 빠지고, 글자는 아이콘 뒤에 붙는다.
    expect(pill.textContent).toBe(icon + label)
    expect(pill.classList.contains(cls)).toBe(true)
    expect(pill.querySelector('.ms')?.getAttribute('aria-hidden')).toBe('true')
    expect(CARD_STATUS[status].label).toBe(label)
  })

  it('역 이름, 호선 배지, 한 줄 설명을 보여 준다', () => {
    render(<StationAnswerCards cards={[card({ lines: ['2', '7'] })]} onOpenStation={() => {}} />)
    const c = $('.station-card') as HTMLElement
    expect(within(c).getByText('강남역')).toBeTruthy()
    expect(c.querySelectorAll('.line-badge').length).toBe(2)
    expect(within(c).getByText('엘리베이터 3대 중 3대 정상 운행')).toBeTruthy()
  })

  it('역 정보 보기 버튼은 그 역 ID로 openStation을 부른다', () => {
    const onOpen = vi.fn()
    render(<StationAnswerCards cards={[card({ stationId: 'sindorim', name: '신도림역' }), card({ stationId: 'gangnam' })]} onOpenStation={onOpen} />)
    const buttons = document.querySelectorAll<HTMLButtonElement>('.station-card-open')
    expect(buttons.length).toBe(2)
    fireEvent.click(buttons[0])
    expect(onOpen).toHaveBeenLastCalledWith('sindorim')
    fireEvent.click(buttons[1])
    expect(onOpen).toHaveBeenLastCalledWith('gangnam')
    expect(onOpen).toHaveBeenCalledTimes(2)
  })

  it('XSS: 역 이름에 든 HTML은 실행되지 않고 글자로 보인다', () => {
    const w = window as unknown as { __xss116?: boolean }
    w.__xss116 = undefined
    const payload = '<img src=x onerror="window.__xss116=true">'
    render(<StationAnswerCards cards={[card({ name: payload, description: '<script>window.__xss116=true</script>' })]} onOpenStation={() => {}} />)
    expect($('.station-card img')).toBeNull()
    expect($('.station-card script')).toBeNull()
    expect($('.station-card-name')?.textContent).toBe(payload)
    expect(w.__xss116).toBeUndefined()
  })
})

describe('buildStationCards', () => {
  it('일반 답변(액션 없음)은 카드가 없다', () => {
    expect(buildStationCards([])).toEqual({ cards: [], rest: [] })
  })

  it('데이터가 있는 openStation은 카드가 되고, 같은 역은 한 번만 나온다', () => {
    const { cards, rest } = buildStationCards([
      { type: 'openStation', label: '강남역 상세 보기', payload: { stationId: 'gangnam' } },
      { type: 'openStation', label: '강남 보기', payload: 'gangnam' },
      { type: 'openTime', label: '출발 시각 계산하기', payload: { originId: 'a', destId: 'b' } },
    ])
    expect(cards.map((c) => c.stationId)).toEqual(['gangnam'])
    expect(cards[0].name).toBe('강남역')
    expect(cards[0].lines).toEqual(['2'])
    expect(rest.map((a) => a.type)).toEqual(['openTime'])
  })

  it('역을 찾을 수 없으면 카드를 만들지 않고 버튼으로 남긴다', () => {
    const action = { type: 'openStation', label: '없는 역', payload: { stationId: 'no-such-station' } }
    expect(buildStationCards([action])).toEqual({ cards: [], rest: [action] })
  })

  it('엘리베이터 데이터가 없으면 상태는 확인 필요다', () => {
    vi.spyOn(window.ElevatorService, 'hasElevatorData').mockReturnValue(false)
    vi.spyOn(window.ElevatorService, 'getStationStatus').mockReturnValue('AVAILABLE')
    const { cards } = buildStationCards([{ type: 'openStation', label: '강남', payload: 'gangnam' }])
    expect(cards[0].status).toBe('UNKNOWN')
    expect(cards[0].description).toContain('확인하지 못했어요')
  })
})

describe('챗 답변 렌더링', () => {
  it('일반 답변은 말풍선으로 그대로 보이고 역 카드는 없다', async () => {
    vi.spyOn(window.AIAgent, 'processMessage').mockResolvedValue({ text: '안녕하세요, 무엇을 도와드릴까요?', actions: [], suggestions: [] })
    render(<App />)
    fireEvent.change($('#chatInput')!, { target: { value: '안녕' } })
    fireEvent.submit($('#chatForm')!)
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    await vi.waitFor(() => {
      const bubbles = document.querySelectorAll('#chatMessages .bubble-answer')
      expect(bubbles[bubbles.length - 1]?.textContent).toContain('무엇을 도와드릴까요?')
    })
    expect(document.querySelectorAll('#chatMessages .station-card').length).toBe(0)
    expect(document.querySelectorAll('#chatMessages .msg-actions').length).toBe(0)
  })

  it('XSS: 서버 답변의 스크립트·이미지 태그는 실행되지 않는다', async () => {
    const w = window as unknown as { __xss116?: boolean }
    w.__xss116 = undefined
    vi.spyOn(window.AIAgent, 'processMessage').mockResolvedValue({
      text: '<img src=x onerror="window.__xss116=true"><script>window.__xss116=true</script>',
      actions: [{ type: 'openStation', label: '<img src=x onerror="window.__xss116=true">', payload: { stationId: 'gangnam' } }],
    })
    render(<App />)
    fireEvent.change($('#chatInput')!, { target: { value: '강남역' } })
    fireEvent.submit($('#chatForm')!)
    await vi.waitFor(() => expect($('#chatMessages .station-card')).not.toBeNull())
    expect($('#chatMessages img')).toBeNull()
    expect($('#chatMessages script')).toBeNull()
    expect(w.__xss116).toBeUndefined()
  })
})
