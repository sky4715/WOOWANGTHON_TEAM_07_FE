// 엘리베이터 탭(#view-elevator). app.js 엘리베이터 탭(요약·필터·목록)을 옮겼다.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useApp } from '../../app/context'
import { Icon } from '../../components/Icon'
import { LineBadges } from '../../components/LineBadge'
import { useElevatorVersion } from '../../hooks/useElevatorService'
import { ES } from '../../legacy/services'
import {
  allStations, apiMode, getElevators, getLine, hasData, isDown, koCompare, liveState,
  STATUS_CLASS, statusIcon, statusLabel, stationStatus, yeok,
} from '../../lib/stations'
import { nowHHMM, showBeTime, showTime } from '../../lib/time'
import { setCustomFilters, useCustomFilters, useSignedIn } from './filterStore'
import './elevator-filter.css'

// 기본 필터: 전체역 · 고장·점검(이용 불가 + 일부 운행, 상태 불명은 제외). 호선은 '+ 노선'으로 추가한다 (#103, #114).
const ELEV_FILTERS = [
  { id: 'all', label: '전체역' },
  { id: 'problem', label: '고장·점검' },
]
const STATUS_RANK: Record<string, number> = { UNAVAILABLE: 0, PARTIAL: 1, AVAILABLE: 2, UNKNOWN: 3 }

interface Item { station: ReturnType<typeof allStations>[number]; status: string; total: number | null; down: number; unknown: number; countsConfirmed: boolean }

function dataStations(): Item[] {
  const live = apiMode()
  const es = ES()
  return allStations().filter((s) => live || hasData(s.id)).map((s) => {
    const elevs = getElevators(s.id)
    const info = live && es ? es.getStationInfo(s.id) : null
    const detailsReady = !live || es?.getElevatorsState(s.id) === 'ready'
    const total = typeof info?.total === 'number' ? info.total : (detailsReady ? elevs.length : null)
    const unknown = typeof info?.unknown === 'number' ? info.unknown : elevs.filter((e) => e.status === 'UNKNOWN').length
    const status = stationStatus(s.id)
    return {
      station: s, status, total, down: elevs.filter(isDown).length, unknown,
      countsConfirmed: detailsReady && status !== 'UNKNOWN' && total !== null && total > 0 && total === elevs.length && unknown === 0,
    }
  })
}

function stoppedWhere(stationId: string): string {
  const stopped = getElevators(stationId).filter(isDown)
  return stopped.length ? stopped[0].location + (stopped.length > 1 ? ' 외 ' + (stopped.length - 1) + '곳' : '') : ''
}

export function ElevatorView() {
  const { currentTab, openStation, openSheet } = useApp()
  const version = useElevatorVersion()
  const signedIn = useSignedIn()
  const customFilters = useCustomFilters()
  // 활성 필터 하나만 둔다 (#121). 'all' | 'problem' | 호선 ID
  const [active, setActive] = useState<string>('all')
  // 호선 칩이 사라지거나(로그아웃·삭제·시트 해제) 활성 호선이 없어지면 '전체역'으로 되돌린다
  useEffect(() => {
    if (active === 'all' || active === 'problem') return
    if (!signedIn || !customFilters.includes(active)) setActive('all')
  }, [active, customFilters, signedIn])
  const [fadeHidden, setFadeHidden] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 목업에는 갱신 시각이 없어 앱을 연 시각, 상태가 바뀌면 그 시각 (REQ-ELV-003)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- version이 바뀔 때마다 시각을 새로 잡는다
  const updatedAt = useMemo(() => new Date(), [version])

  const updateOverflow = useCallback(() => {
    const s = scrollRef.current
    if (!s) return
    setFadeHidden(s.scrollWidth - s.clientWidth - s.scrollLeft <= 1)
  }, [])
  useEffect(() => {
    const s = scrollRef.current
    if (!s || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(updateOverflow)
    ro.observe(s)
    return () => ro.disconnect()
  }, [updateOverflow])
  useEffect(() => {
    const id = requestAnimationFrame(updateOverflow)
    return () => cancelAnimationFrame(id)
  }, [signedIn, customFilters, updateOverflow])


  // 노선을 추가하면 새 칩과 '+ 노선'이 보이도록 오른쪽 끝으로 스크롤한다 (#103)
  const prevCount = useRef(customFilters.length)
  useEffect(() => {
    if (customFilters.length > prevCount.current && scrollRef.current) {
      const s = scrollRef.current
      requestAnimationFrame(() => { s.scrollLeft = s.scrollWidth })
    }
    prevCount.current = customFilters.length
  }, [customFilters.length])

  let updatedText: string
  if (!apiMode()) updatedText = showTime(nowHHMM(updatedAt)) + ' 기준'
  else {
    const ls = liveState(), es = ES()
    if (ls.phase === 'loading') updatedText = '확인 중'
    else if (ls.phase === 'error') updatedText = '연결 실패'
    else updatedText = (es && es.getDataTime ? showBeTime(es.getDataTime()) : null) || '갱신 시각 없음'
  }

  const all = dataStations()
  const counts: Record<string, number> = { AVAILABLE: 0, PARTIAL: 0, UNAVAILABLE: 0, UNKNOWN: 0 }
  all.forEach((x) => { if (counts[x.status] !== undefined) counts[x.status]++ })
  const cards = [{ key: 'AVAILABLE', cls: 'ok' }, { key: 'PARTIAL', cls: 'warn' }, { key: 'UNAVAILABLE', cls: 'bad' }]
  const live = apiMode()
  const lsum = live ? liveState() : null
  let summary
  if (lsum && lsum.phase !== 'ready') {
    summary = <div className="empty">{lsum.phase === 'loading' ? '엘리베이터 상태를 확인 중이에요' : '연결 실패 · 모든 역을 정보 없음으로 표시해요'}</div>
  } else if (live && counts.UNKNOWN > 0 && counts.AVAILABLE + counts.PARTIAL + counts.UNAVAILABLE === 0) {
    summary = <div className="summary-card unknown" role="status" style={{ gridColumn: '1 / -1' }}>
      <div className="summary-icon"><Icon name="help" /></div>
      <div className="summary-label">운행 상태 정보 없음</div>
      <div className="summary-body"><span className="summary-num">{counts.UNKNOWN}</span><span className="summary-unit">역</span></div>
      <div className="card-sub">최신 운행 상태를 확인할 수 없어요. 역을 눌러 설비 목록과 수집 시각을 확인해 주세요.</div>
    </div>
  } else {
    summary = <>
      {cards.map((c) => (
        <div className={'summary-card ' + c.cls} key={c.key}>
          <div className="summary-icon"><Icon name={statusIcon(c.key)} /></div>
          <div className="summary-label">{statusLabel(c.key)}</div>
          <div className="summary-body"><span className="summary-num">{counts[c.key]}</span><span className="summary-unit">역</span></div>
        </div>
      ))}
      {live && <div className="summary-unknown-note muted">{statusLabel('UNKNOWN')} {counts.UNKNOWN}역</div>}
    </>
  }

  // 활성 필터는 하나: 'all' | 'problem' | 호선 ID (#121). 현재 칩으로 남아 있는 호선만 활성화될 수 있다.
  const activeLine = signedIn && customFilters.includes(active) ? active : null
  const items = all.filter((x) => {
    const sl = x.station.lines || []
    if (activeLine) return sl.includes(activeLine)
    switch (active) {
      // 고장·점검: 이용 불가 또는 일부 운행. 상태를 모르는 역(UNKNOWN)은 고장으로 분류하지 않는다
      case 'problem': return x.status === 'UNAVAILABLE' || x.status === 'PARTIAL'
      default: return true
    }
  })
  // 호선 칩 본문: 같은 칩을 다시 누르면 '전체역'
  const toggleLine = (id: string) => setActive((cur) => (cur === id ? 'all' : id))
  // 칩 제거: 선택된 칩이면 '전체역'으로, 아니면 현재 선택 유지
  const removeLine = (id: string) => {
    setCustomFilters(customFilters.filter((x) => x !== id))
    setActive((cur) => (cur === id ? 'all' : cur))
  }
  // 고장·점검 탭: 다시 누르면 '전체역'
  const toggleProblem = () => setActive((cur) => (cur === 'problem' ? 'all' : 'problem'))
  items.sort((a, b) => {
    const r = (STATUS_RANK[a.status] || 0) - (STATUS_RANK[b.status] || 0)
    return r !== 0 ? r : koCompare(a.station.name, b.station.name)
  })

  const onRowKey = (e: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    openStation(id)
  }

  return (
    <section id="view-elevator" className={'view' + (currentTab === 'elevator' ? ' active' : '')} data-view="elevator">
      <div className="view-scroll">
        {/* 위쪽 흰 영역: 제목 + 요약 카드 + 필터 탭 (REQ-ELV-007) */}
        <div className="elev-head elevator-header">
          <div className="elev-title-row">
            <h2 className="view-title">엘리베이터 현황</h2>
            <span id="elevUpdated" className="elev-updated">{updatedText}</span>
          </div>
          <div id="elevatorSummary" className="summary-grid">{summary}</div>
        </div>
        {/* 상단 고정 필터: 전체역 · 고장 · 점검 · (추가한 노선…) · + 노선. 한 줄, 필터 영역 안에서만 가로 스크롤 (#103) */}
        <div id="elevatorFilter" className="filter-tabs elevator-filter" role="toolbar" aria-label="역 목록 거르기">
          <div id="elevatorFilterScroll" className="elevator-filter-scroll" tabIndex={0} role="region" aria-label="엘리베이터 필터 좌우 스크롤"
            ref={scrollRef} onScroll={updateOverflow}>
            <div className="elevator-filter-inner">
              <div className="filter-tabs-row">
                {ELEV_FILTERS.map((x) => (
                  <button type="button" key={x.id} className={'filter-tab' + (active === x.id ? ' active' : '')} data-filter={x.id}
                    aria-pressed={active === x.id} onClick={() => (x.id === 'all' ? setActive('all') : toggleProblem())}>{x.label}</button>
                ))}
              </div>
              <span id="customFilterChips" className="custom-filter-slot" hidden={!signedIn}>
                {signedIn && customFilters.map((lineId) => {
                  const l = getLine(lineId)
                  const on = activeLine === lineId
                  // 칩 본문은 선택 토글, × 는 칩 제거. 두 버튼은 형제라서 × 클릭이 선택을 바꾸지 않는다.
                  return (
                    <span className={'custom-filter-chip' + (on ? ' selected' : '')} key={lineId} data-custom-filter={lineId} style={{ '--line-color': l.color } as CSSProperties}>
                      <button type="button" className="custom-filter-body" data-select-line={lineId} aria-pressed={on}
                        aria-label={l.name + (on ? ' 선택됨, 선택 해제' : ' 선택')} onClick={() => toggleLine(lineId)}>
                        <span className="custom-filter-dot" aria-hidden="true"></span>
                        {l.name}
                      </button>
                      <button type="button" className="chip-x" data-remove-filter={lineId} aria-label={l.name + ' 필터 제거'}
                        onClick={() => removeLine(lineId)}>×</button>
                    </span>
                  )
                })}
              </span>
              <button type="button" className="chip-add-btn" id="addFilterBtn" hidden={!signedIn}
                onClick={() => { if (signedIn) openSheet('filter', { stationId: null }, 'auto') }}>
                <Icon name="add" />노선
              </button>
            </div>
          </div>
          <span id="elevatorFilterFade" className="filter-fade" aria-hidden="true" hidden={fadeHidden}></span>
        </div>
        <div id="elevatorList" className="station-list">
          {!items.length ? <div className="empty">선택한 조건에 맞는 역이 없어요</div> : items.map((x) => {
            const s = x.station
            const up = x.countsConfirmed && x.total !== null ? x.total - x.down : null
            const where = stoppedWhere(s.id)
            const notes = [where ? '멈춤: ' + where : '', x.unknown > 0 ? '미확인: ' + x.unknown + '대' : ''].filter(Boolean).join(' · ')
            const sentence = yeok(s) + ', ' + (s.lines || []).join(', ') + '호선, ' +
              (up !== null ? '엘리베이터 ' + x.total + '대 중 ' + up + '대 운행' : '운행 상태 ' + statusLabel(x.status) + (x.total !== null ? ', 설비 ' + x.total + '대' : '')) +
              (notes ? ', ' + notes : '')
            return (
              <div className="station-row elev-row" key={s.id} data-id={s.id} role="button" tabIndex={0} aria-label={sentence}
                onClick={() => openStation(s.id)} onKeyDown={(e) => onRowKey(e, s.id)}>
                <div className="elev-row-name" aria-hidden="true"><strong>{yeok(s)}</strong> <LineBadges station={s} /></div>
                <div className={'elev-row-op ' + (STATUS_CLASS[x.status] || 'unknown')} aria-hidden="true">
                  <Icon name={statusIcon(x.status)} />
                  {up !== null ? <span><b>{up}</b>/{x.total}대</span> : <span>{statusLabel(x.status)}{x.total !== null ? ' · 설비 ' + x.total + '대' : ''}</span>}
                </div>
                <span className="chevron ms" aria-hidden="true">chevron_right</span>
                {notes && <div className="elev-row-stop" aria-hidden="true">{notes}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
