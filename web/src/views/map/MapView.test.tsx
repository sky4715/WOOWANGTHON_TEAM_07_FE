import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
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

  it('범례 원은 테두리 없이 상태 색 채움만 남는다', () => {
    render(<App />)
    for (const cls of ['warn', 'bad']) {
      const node = document.querySelector(`.map-legend .lg-node.${cls}`) as HTMLElement
      expect(getComputedStyle(node).borderTopWidth).toBe('0px')
      expect(getComputedStyle(node).borderRadius).toBe('50%')
    }
  })
})
