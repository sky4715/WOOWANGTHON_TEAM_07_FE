import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import App from '../../App'

// 지도 CSS는 index.html이 /legacy/css/map.css로 불러온다. jsdom에서도 같은 규칙으로 계산하도록 주입한다.
const MAP_CSS = fs.readFileSync(path.resolve(__dirname, '../../../../Prototype-v2/css/map.css'), 'utf8')

beforeAll(() => {
  const style = document.createElement('style')
  style.textContent = MAP_CSS
  document.head.appendChild(style)
})

afterEach(() => { cleanup(); vi.restoreAllMocks() })

function stationStatuses(status: Record<string, string>) {
  const es = window.ElevatorService
  vi.spyOn(es, 'hasElevatorData').mockReturnValue(true)
  vi.spyOn(es, 'getStationStatus').mockImplementation((id: string) => status[id] ?? 'AVAILABLE')
}

// jsdom은 SVG 속성의 계산값을 채우지 않으므로, 스타일시트 규칙을 순서대로 보고 마지막 일치 규칙을 고른다.
// 규칙이 없으면 SVG 표현 속성(stroke="...")을 쓴다.
function effective(el: Element, prop: 'stroke' | 'fill'): string {
  let value = el.getAttribute(prop) ?? ''
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from((sheet as CSSStyleSheet).cssRules)) {
      const r = rule as CSSStyleRule
      if (!r.selectorText || !r.style) continue
      const selectors = r.selectorText.split(',').map((x) => x.trim())
      if (!selectors.some((sel) => { try { return el.matches(sel) } catch { return false } })) continue
      const v = r.style.getPropertyValue(prop)
      if (v) value = v.trim()
    }
  }
  return value
}

function circleOf(id: string) {
  const node = document.querySelector(`#mapContainer .station-node[data-id="${id}"]`)
  if (!node) throw new Error(`station ${id} not rendered`)
  return { node, circle: node.querySelector('.st-circle') as SVGCircleElement, ring: node.querySelector('.status-ring') as SVGCircleElement }
}

describe('지도 역 상태 표시', () => {
  it('일부 운행·이용 불가 역은 기본 원만 남기고 바깥 고리(테두리)를 그리지 않는다', () => {
    stationStatuses({ sillim: 'PARTIAL', seoul: 'UNAVAILABLE', hongik: 'AVAILABLE' })
    render(<App />)

    const partial = circleOf('sillim')
    const unavailable = circleOf('seoul')
    const normal = circleOf('hongik')
    expect(partial.node.classList.contains('st-warn')).toBe(true)
    expect(unavailable.node.classList.contains('st-bad')).toBe(true)
    expect(normal.node.classList.contains('st-ok')).toBe(true)

    // 기본 원(채움)은 그대로 남는다
    for (const c of [partial.circle, unavailable.circle]) {
      expect(c.getAttribute('r')).toBe('14.5')
      expect(effective(c, 'stroke')).toBe('none')
    }
    expect(effective(partial.circle, 'fill')).not.toBe('none')
    expect(effective(unavailable.circle, 'fill')).not.toBe('none')

    // 정상 역은 노선 색 테두리를 그대로 가진다
    expect(effective(normal.circle, 'stroke')).not.toBe('none')
    // 상태 고리(펄스)는 평소에 보이지 않는다
    expect(effective(partial.ring, 'display')).toBe('none')
    expect(effective(unavailable.ring, 'display')).toBe('none')
  })
})
