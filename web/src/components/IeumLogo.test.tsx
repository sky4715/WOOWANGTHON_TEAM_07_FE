import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { IeumLogo } from './IeumLogo'

afterEach(cleanup)

it('원본 곡선 경로와 색상을 유지한다', () => {
  const { container } = render(<IeumLogo />)
  const a = container.querySelector('.ieum-logo-curve-a')
  const b = container.querySelector('.ieum-logo-curve-b')
  expect(a?.getAttribute('d')).toBe('M328 359 L380 282 Q396 260 414 284 L455 344')
  expect(b?.getAttribute('d')).toBe('M413 359 L459 300 Q476 278 493 304 L518 345')
  expect(a?.getAttribute('stroke')).toBe('#3387F7')
  expect(b?.getAttribute('stroke')).toBe('#1759BB')
})

it('접근 가능한 이름과 문구를 제공한다', () => {
  const { container } = render(<IeumLogo />)
  expect(screen.getByRole('img', { name: '이음 — 모두의 이동을 잇다' })).toBeTruthy()
  expect(container.textContent).toContain('이음')
  expect(container.textContent).toContain('모두의 이동을 잇다')
  expect(container.textContent).not.toContain('마중')
  expect(container.querySelector('svg')?.getAttribute('width')).toBeNull()
})

it('animated=false이면 하이라이트를 렌더링하지 않는다', () => {
  const off = render(<IeumLogo animated={false} />)
  expect(off.container.querySelector('.ieum-logo-flow')).toBeNull()
  cleanup()
  const on = render(<IeumLogo />)
  expect(on.container.querySelectorAll('.ieum-logo-flow')).toHaveLength(2)
})

it('반짝임 장식은 정적이다', () => {
  const { container } = render(<IeumLogo />)
  const sparkle = container.querySelector('.ieum-logo-sparkle')
  expect(sparkle).not.toBeNull()
  expect(sparkle?.querySelector('[class*="flow"]')).toBeNull()
  expect(sparkle?.getAttribute('class')).toBe('ieum-logo-sparkle')
})
