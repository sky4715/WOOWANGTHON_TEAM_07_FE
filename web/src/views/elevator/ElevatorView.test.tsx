import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import App from '../../App'

const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null
const $$ = (sel: string) => Array.from(document.querySelectorAll(sel)) as HTMLElement[]

beforeEach(() => { sessionStorage.clear() })
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.removeAttribute('data-active-tab') })

function liveService(status: 'AVAILABLE' | 'UNKNOWN' = 'UNKNOWN') {
  const es = window.ElevatorService
  vi.spyOn(es, 'isLive').mockReturnValue(true)
  vi.spyOn(es, 'startLive').mockResolvedValue()
  vi.spyOn(es, 'getLiveState').mockReturnValue({ live: true, phase: 'ready', error: null })
  vi.spyOn(es, 'getStationInfo').mockReturnValue({ status, total: 4, unknown: status === 'UNKNOWN' ? 4 : 0, dataFresh: status !== 'UNKNOWN' })
  vi.spyOn(es, 'getElevatorsState').mockReturnValue('idle')
  vi.spyOn(es, 'getElevators').mockReturnValue([])
  vi.spyOn(es, 'getStationStatus').mockReturnValue(status)
  return es
}

describe('엘리베이터 탭', () => {
  it('전체 운행 상태가 미확인이면 0개 카드 대신 정보 없음과 설비 수를 표시한다', () => {
    liveService()
    render(<App />)
    expect($$('#elevatorSummary .summary-card')).toHaveLength(1)
    expect($('#elevatorSummary [role="status"]')?.textContent).toContain('운행 상태 정보 없음')
    expect($('#elevatorSummary')?.textContent).toContain('최신 운행 상태를 확인할 수 없어요')
    expect($('#elevatorList .station-row')?.textContent).toContain('설비 4대')
    expect($('#elevatorList .station-row')?.getAttribute('aria-label')).toContain('미확인: 4대')
    expect($('#elevatorList')?.textContent).not.toContain('0/0대')
  })

  it('설비 상세를 열기 전에도 BE 요약의 대수를 쓰고 고장 필터에 문제 역을 포함한다', () => {
    const es = liveService('AVAILABLE')
    vi.mocked(es.getStationStatus).mockImplementation((id) => id === 'cityhall' ? 'UNAVAILABLE' : 'AVAILABLE')
    render(<App />)
    expect($('#elevatorList .station-row')?.textContent).toContain('설비 4대')
    expect($('#elevatorList')?.textContent).not.toContain('0/0대')
    fireEvent.click($('[data-filter="problem"]')!)
    expect($$('#elevatorList .station-row').map((r) => r.dataset.id)).toEqual(['cityhall'])
  })

  it('일부 설비 상태가 미확인이면 그 설비를 운행 대수에 포함하지 않는다', () => {
    const es = liveService('AVAILABLE')
    vi.mocked(es.getElevatorsState).mockReturnValue('ready')
    vi.mocked(es.getStationInfo).mockReturnValue({ status: 'AVAILABLE', total: 4, unknown: 1, dataFresh: false })
    vi.mocked(es.getElevators).mockReturnValue([
      { id: '1', status: 'AVAILABLE' }, { id: '2', status: 'AVAILABLE' },
      { id: '3', status: 'AVAILABLE' }, { id: '4', status: 'UNKNOWN' },
    ])
    render(<App />)
    expect($('#elevatorList .station-row')?.textContent).toContain('미확인: 1대')
    expect($('#elevatorList .station-row')?.textContent).not.toContain('4/4대')
  })

  it('설비가 0대인 역의 상세 조회가 끝나도 0/0 운행 비율을 만들지 않는다', () => {
    const es = liveService()
    vi.mocked(es.getElevatorsState).mockReturnValue('ready')
    vi.mocked(es.getStationInfo).mockReturnValue({ status: 'UNKNOWN', total: 0, unknown: 0, dataFresh: false })
    render(<App />)
    expect($('#elevatorList .station-row')?.textContent).toContain('정보 없음 · 설비 0대')
    expect($('#elevatorList .station-row')?.textContent).not.toContain('0/0대')
  })

  it('요약 카드 3개, 갱신 시각, 필터 탭 4개, 목록 행', () => {
    render(<App />)
    expect($$('#elevatorSummary .summary-card').length).toBe(3)
    expect($('#elevUpdated')?.textContent).toMatch(/기준$/)
    expect($$('#elevatorFilter .filter-tab').map((t) => t.getAttribute('data-filter'))).toEqual(['all', 'problem'])
    expect($$('#elevatorList .station-row[data-id]').length).toBeGreaterThan(0)
    expect($('#addFilterBtn')?.hidden).toBe(true)
  })

  it('정렬: 이용 불가 → 일부 → 정상 순', () => {
    render(<App />)
    const rank: Record<string, number> = { UNAVAILABLE: 0, PARTIAL: 1, AVAILABLE: 2, UNKNOWN: 3 }
    const ranks = $$('#elevatorList .station-row').map((r) => rank[window.ElevatorService.getStationStatus(r.dataset.id!)])
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('+ 노선으로 노선을 추가 순서대로 붙이고 칩으로 제거한다 (#103)', () => {
    act(() => { window.AuthService.login('google') })
    render(<App />)
    const chips = () => $$('#customFilterChips [data-custom-filter]').map((c) => c.dataset.customFilter)
    fireEvent.click($('#addFilterBtn')!)
    fireEvent.click($('[data-pick-line="2"]')!)
    fireEvent.click($('[data-pick-line="7"]')!)
    fireEvent.click($('#filterPickerDone')!)
    expect(chips()).toEqual(['2', '7'])
    fireEvent.click($('#addFilterBtn')!)
    fireEvent.click($('[data-pick-line="3"]')!)
    fireEvent.click($('#filterPickerDone')!)
    expect(chips()).toEqual(['2', '7', '3'])
    // '+ 노선'은 스크롤 영역 안의 마지막 요소다
    expect($('#elevatorFilterScroll .elevator-filter-inner')?.lastElementChild?.id).toBe('addFilterBtn')
    fireEvent.click($('[data-remove-filter="7"]')!)
    expect(chips()).toEqual(['2', '3'])
    // 칩은 본문을 눌러 선택해야 목록을 거른다 (#114)
    fireEvent.click($('[data-select-line="2"]')!)
    fireEvent.click($('[data-select-line="3"]')!)
    const rows = $$('#elevatorList .station-row')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => window.ElevatorService.getStation(r.dataset.id!)?.lines.some((l) => l === '2' || l === '3'))).toBe(true)
  })

  it('칩 본문 클릭은 선택을 토글하고 × 는 선택 없이 칩만 제거한다 (#114)', () => {
    act(() => { window.AuthService.login('google') })
    render(<App />)
    fireEvent.click($('#addFilterBtn')!)
    fireEvent.click($('[data-pick-line="2"]')!)
    fireEvent.click($('[data-pick-line="3"]')!)
    fireEvent.click($('#filterPickerDone')!)
    const body2 = () => $('[data-select-line="2"]') as HTMLButtonElement
    expect(body2().getAttribute('aria-pressed')).toBe('false')
    const before = $$('#elevatorList .station-row').length
    fireEvent.click(body2())
    expect(body2().getAttribute('aria-pressed')).toBe('true')
    expect($('[data-custom-filter="2"]')?.classList.contains('selected')).toBe(true)
    const rows = $$('#elevatorList .station-row')
    expect(rows.every((r) => window.ElevatorService.getStation(r.dataset.id!)?.lines.includes('2'))).toBe(true)
    expect(rows.length).toBeLessThanOrEqual(before)
    fireEvent.click(body2())
    expect(body2().getAttribute('aria-pressed')).toBe('false')
    expect($$('#elevatorList .station-row').length).toBe(before)
    // × 는 선택 상태를 바꾸지 않고 칩만 지운다
    fireEvent.click(body2())
    fireEvent.click($('[data-remove-filter="2"]')!)
    expect($('[data-custom-filter="2"]')).toBeNull()
    expect($('[data-custom-filter="3"]')).not.toBeNull()
    expect($$('#elevatorList .station-row').length).toBe(before)
  })

  it('필터는 항상 하나만 선택된다: 전체역·고장점검·호선 전환, 재클릭 시 전체역 (#121)', () => {
    act(() => { window.AuthService.login('google') })
    render(<App />)
    fireEvent.click($('#addFilterBtn')!)
    fireEvent.click($('[data-pick-line="2"]')!)
    fireEvent.click($('[data-pick-line="3"]')!)
    fireEvent.click($('#filterPickerDone')!)
    const pressed = () => $$('#elevatorFilter [aria-pressed="true"]').map((b) => b.dataset.filter ?? b.dataset.selectLine)
    const allLines = () => $$('#elevatorList .station-row').map((r) => r.dataset.id)
    expect(pressed()).toEqual(['all'])
    const all = allLines().length
    fireEvent.click($('[data-filter="problem"]')!)
    expect(pressed()).toEqual(['problem'])
    fireEvent.click($('[data-select-line="2"]')!)
    expect(pressed()).toEqual(['2'])
    // 2호선을 고르면 고장·점검 선택이 풀리고, 2호선 역은 상태와 상관없이 모두 보인다
    const line2 = allLines().filter((id) => window.ElevatorService.getStation(id!)?.lines.includes('2'))
    expect(allLines()).toEqual(line2)
    expect(line2.length).toBeGreaterThan(0)
    fireEvent.click($('[data-select-line="3"]')!)
    expect(pressed()).toEqual(['3'])
    fireEvent.click($('[data-select-line="3"]')!)
    expect(pressed()).toEqual(['all'])
    expect(allLines().length).toBe(all)
    // 선택된 호선을 X로 지우면 전체역, 선택되지 않은 호선을 지우면 선택 유지
    fireEvent.click($('[data-select-line="2"]')!)
    fireEvent.click($('[data-remove-filter="2"]')!)
    expect(pressed()).toEqual(['all'])
    fireEvent.click($('[data-select-line="3"]')!)
    fireEvent.click($('[data-filter="all"]')!)
    expect(pressed()).toEqual(['all'])
    // 선택되지 않은 칩 X는 선택을 유지한다
    fireEvent.click($('[data-select-line="3"]')!)
    fireEvent.click($('[data-remove-filter="3"]')!)
    expect(pressed()).toEqual(['all'])
    // 호선 추가는 선택을 바꾸지 않는다
    fireEvent.click($('[data-filter="problem"]')!)
    fireEvent.click($('#addFilterBtn')!)
    fireEvent.click($('[data-pick-line="5"]')!)
    fireEvent.click($('#filterPickerDone')!)
    expect(pressed()).toEqual(['problem'])
  })

  it('고장·점검은 이용 불가·일부 운행만 포함하고 상태를 모르는 역은 제외한다 (#114)', () => {
    const es = liveService('AVAILABLE')
    vi.mocked(es.getStationStatus).mockImplementation((id) => id === 'cityhall' ? 'UNAVAILABLE' : id === 'jongno3' ? 'PARTIAL' : id === 'euljiro1' ? 'UNKNOWN' : 'AVAILABLE')
    render(<App />)
    fireEvent.click($('[data-filter="problem"]')!)
    const ids = $$('#elevatorList .station-row').map((r) => r.dataset.id)
    expect(ids).toContain('cityhall')
    expect(ids).not.toContain('euljiro1')
    expect(ids.every((id) => ['UNAVAILABLE', 'PARTIAL'].includes(window.ElevatorService.getStationStatus(id!)))).toBe(true)
  })

  it('행을 누르면 역 시트가 열린다', () => {
    render(<App />)
    fireEvent.click($('#elevatorList .station-row[data-id]')!)
    expect($('#bottomSheet')).not.toBeNull()
    expect(document.body.getAttribute('data-active-tab')).toBe('map')
  })

  it('로그인하면 노선 필터를 추가·저장하고, 로그아웃하면 비운다', async () => {
    render(<App />)
    await act(async () => { await window.AuthService.login('google') })
    expect($('#addFilterBtn')?.hidden).toBe(false)
    fireEvent.click($('#addFilterBtn')!)
    expect($('#filterPicker')).not.toBeNull()
    fireEvent.click($('[data-pick-line="2"]')!)
    expect($('[data-pick-line="2"]')?.classList.contains('selected')).toBe(true)
    fireEvent.click($('#filterPickerDone')!)
    expect(sessionStorage.getItem('elevSubway.elevFilters.v1')).toBe('["2"]')
    expect($$('[data-custom-filter]').length).toBe(1)
    fireEvent.click($('[data-select-line="2"]')!)
    const rows = $$('#elevatorList .station-row')
    expect(rows.every((r) => window.ElevatorService.getStation(r.dataset.id!)?.lines.includes('2'))).toBe(true)
    await act(async () => { await window.AuthService.logout() })
    expect($('#addFilterBtn')?.hidden).toBe(true)
    expect(sessionStorage.getItem('elevSubway.elevFilters.v1')).toBe('[]')
  })
})
