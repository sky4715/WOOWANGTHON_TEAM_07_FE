// 노선도 탭(#view-map): 호선 필터 칩, 지도(MetroMap), 확대/축소 버튼, 범례.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useApp } from '../../app/context'
import { Icon } from '../../components/Icon'
import { mapCall } from '../../lib/stations'
import { MetroMapView } from './MetroMapView'

interface LineInfo { id: string; name: string; color: string }

function useLines(): LineInfo[] {
  const lines = (window.MOCK && window.MOCK.lines) || {}
  return Object.keys(lines).map((id) => ({ id, name: lines[id].name, color: lines[id].color }))
}

function LineFilter() {
  const lines = useLines()
  const [activeLine, setActiveLine] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const pick = (lineId: string | null) => {
    const id = lineId && lineId === activeLine ? null : lineId // 같은 노선 다시 누르면 전체
    setActiveLine(id)
    mapCall('setLineFilter', id)
  }

  // 선택이 바뀌면 그 칩이 가로 스크롤 영역 안에 보이도록만 옮긴다(페이지는 움직이지 않는다).
  useEffect(() => {
    const box = scrollRef.current
    if (!box) return
    const chip = Array.from(box.querySelectorAll<HTMLElement>('.chip')).find((el) => (el.dataset.line ?? '') === (activeLine ?? ''))
    if (!chip) return
    const pad = 16
    const b = box.getBoundingClientRect()
    const c = chip.getBoundingClientRect()
    if (c.left < b.left + pad) box.scrollLeft -= b.left + pad - c.left
    else if (c.right > b.right - pad) box.scrollLeft += c.right - (b.right - pad)
  }, [activeLine])

  return (
    <div id="lineFilter" ref={scrollRef} className="line-filter" tabIndex={0} role="group" aria-label="노선 선택">
      <button type="button" className={'chip' + (activeLine === null ? ' active' : '')} data-line="" onClick={() => pick(null)}>전체</button>
      {lines.map((l) => (
        <button
          key={l.id}
          type="button"
          className={'chip' + (activeLine === l.id ? ' active' : '')}
          data-line={l.id}
          style={{ '--line-color': l.color } as CSSProperties}
          onClick={() => pick(l.id)}
        ><span className="chip-dot" style={{ background: l.color }}></span>{l.name}</button>
      ))}
    </div>
  )
}

export function MapView() {
  const { currentTab } = useApp()
  return (
    <section id="view-map" className={'view' + (currentTab === 'map' ? ' active' : '')} data-view="map">
      <LineFilter />
      <MetroMapView />
      <div className="map-controls">
        <button id="zoomIn" className="icon-btn" type="button" aria-label="확대" onClick={() => mapCall('zoomIn')}><Icon name="add" size="lg" /></button>
        <button id="zoomOut" className="icon-btn" type="button" aria-label="축소" onClick={() => mapCall('zoomOut')}><Icon name="remove" size="lg" /></button>
        <button id="zoomReset" className="icon-btn" type="button" aria-label="전체 보기" onClick={() => mapCall('resetView')}><Icon name="fit_screen" size="lg" /></button>
      </div>
      <div className="map-legend">
        <span><i className="lg-node ok"></i>정상</span>
        {/* 기호만 쓴다: error/cancel 글꼴은 자체 원을 그려 바깥 원(이중 원)이 생긴다 */}
        <span><i className="lg-node warn"><Icon name="priority_high" /></i>일부 운행</span>
        <span><i className="lg-node bad"><Icon name="close" /></i>이용 불가</span>
        <span><i className="lg-node unknown"></i>정보 없음</span>
      </div>
    </section>
  )
}
