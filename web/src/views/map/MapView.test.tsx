import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import App from '../../App'

// 범례 모양은 map.css의 .map-legend 규칙을 따른다. jsdom에서도 같은 CSS를 주입해 계산한다.
const MAP_CSS = fs.readFileSync(path.resolve(__dirname, '../../../../Prototype-v2/css/map.css'), 'utf8')

beforeAll(() => {
  const style = document.createElement('style')
  style.textContent = MAP_CSS
  document.head.appendChild(style)
})

afterEach(() => cleanup())

describe('노선도 호선 칩 줄', () => {
  it('가로 스크롤 영역은 키보드로 들어갈 수 있고 칩은 한 줄에 놓인다', () => {
    render(<App />)
    const box = document.querySelector('#lineFilter') as HTMLElement
    expect(box.tabIndex).toBe(0)
    expect(getComputedStyle(box).display).toBe('flex')
    expect(getComputedStyle(box).overflowX).toBe('auto')
  })
})

describe('노선도 범례', () => {
  it('일부 운행·이용 불가 아이콘은 글꼴 원을 따로 그리지 않는 기호만 쓴다', () => {
    render(<App />)
    const icon = (cls: string) => document.querySelector(`.map-legend .lg-node.${cls} .ms`)
    expect(icon('warn')?.textContent).toBe('priority_high')
    expect(icon('bad')?.textContent).toBe('close')
  })

  it('범례는 상태 4개를 같은 크기의 원으로 보여 준다', () => {
    render(<App />)
    const items = [...document.querySelectorAll('.map-legend > span')]
    expect(items.map((s) => s.lastChild?.textContent)).toEqual(['정상', '일부 운행', '이용 불가', '정보 없음'])
    const nodes = ['ok', 'warn', 'bad', 'unknown'].map((cls) => {
      const node = document.querySelector(`.map-legend .lg-node.${cls}`) as HTMLElement
      expect(node).not.toBeNull()
      return getComputedStyle(node)
    })
    for (const style of nodes) {
      expect(style.width).toBe('16px')
      expect(style.height).toBe('16px')
      expect(style.borderRadius).toBe('50%')
    }
    const icon = getComputedStyle(document.querySelector('.map-legend .lg-node.warn .ms') as HTMLElement)
    expect(icon.fontSize).toBe('12px')
  })

  it('범례 원은 테두리 없이 상태 색 채움만 남는다', () => {
    render(<App />)
    for (const cls of ['warn', 'bad']) {
      const node = document.querySelector(`.map-legend .lg-node.${cls}`) as HTMLElement
      expect(getComputedStyle(node).borderTopWidth).toBe('0px')
      expect(getComputedStyle(node).borderRadius).toBe('50%')
    }
  })
})

describe('노선도 역 상태 마커', () => {
  it('정상 역 마커에는 체크나 배지가 없고 기본 원·역 이름만 남는다', async () => {
    render(<App />)
    await waitFor(() => expect(document.querySelectorAll('.station-node.st-ok').length).toBeGreaterThan(0))
    for (const g of document.querySelectorAll('.station-node.st-ok')) {
      expect(g.querySelector('.st-circle')).not.toBeNull()
      expect(g.querySelector('.station-label')).not.toBeNull()
      expect(g.querySelector('.st-icon')?.textContent ?? '').toBe('')
      expect(g.querySelector('.badge, .status-badge, .check, .check-mark')).toBeNull()
    }
    expect(document.querySelector('#mapContainer')?.innerHTML).not.toContain('check_circle')
  })

  it('일부 운행 역은 느낌표, 이용 불가 역은 X 아이콘을 유지한다', async () => {
    render(<App />)
    const es = window.ElevatorService!
    es.setStationBroken('ddp', true)
    try {
      await waitFor(() => expect(document.querySelector('.station-node[data-id="ddp"]')?.classList.contains('st-bad')).toBe(true))
      expect(document.querySelector('.station-node[data-id="ddp"] .st-icon')?.textContent).toBe('cancel')
      const partial = document.querySelector('.station-node[data-id="cityhall"]')
      expect(partial?.classList.contains('st-warn')).toBe(true)
      expect(partial?.querySelector('.st-icon')?.textContent).toBe('error')
    } finally {
      es.setStationBroken('ddp', false)
    }
  })

  it('정보 없는 역은 정상 표시나 체크 없이 빈 원으로 남는다', async () => {
    render(<App />)
    await waitFor(() => expect(document.querySelectorAll('.station-node').length).toBeGreaterThan(0))
    const unknown = [...document.querySelectorAll('.station-node')].filter((g) => !/st-(ok|warn|bad)/.test(g.getAttribute('class') ?? ''))
    expect(unknown.length).toBeGreaterThan(0)
    for (const g of unknown) {
      expect(g.querySelector('.st-icon')?.textContent ?? '').toBe('')
      expect(g.querySelector('.st-circle')?.getAttribute('fill') ?? '').toBe('')
    }
  })
})
