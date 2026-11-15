// 역 정보 카드 데이터 도우미 (#116). 구조화된 액션과 앱의 역·엘리베이터 데이터로만 카드를 만든다.
import type { ChatAction } from '../../legacy/globals'
import { getElevators, getStation, hasData, stationStatus, yeok } from '../../lib/stations'

export type CardStatus = 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE' | 'UNKNOWN'

/** 상태별 글자·아이콘·색 클래스. 글자는 카드 요구대로 짧게 쓴다(엘리베이터 상태 이름과 다른 곳이 있다). */
export const CARD_STATUS: Record<CardStatus, { label: string; icon: string; cls: string }> = {
  AVAILABLE: { label: '정상', icon: 'check_circle', cls: 'ok' },
  PARTIAL: { label: '일부 운행', icon: 'error', cls: 'warn' },
  UNAVAILABLE: { label: '이용 불가', icon: 'cancel', cls: 'bad' },
  UNKNOWN: { label: '확인 필요', icon: 'help', cls: 'unknown' },
}

export interface StationCardData {
  stationId: string
  name: string
  lines: string[]
  status: CardStatus
  description: string
}

/** openStation 액션의 역 ID. mock은 문자열, API 매핑 후에는 { stationId }다. */
export function stationIdOfAction(a: ChatAction): string | null {
  if (a.type !== 'openStation') return null
  const p = a.payload as { stationId?: unknown; id?: unknown } | string | null | undefined
  const id = typeof p === 'object' && p ? (p.stationId ?? p.id) : p
  return typeof id === 'string' && id ? id : null
}

function cardStatusOf(id: string): CardStatus {
  if (!hasData(id)) return 'UNKNOWN'
  const s = stationStatus(id)
  return s in CARD_STATUS ? (s as CardStatus) : 'UNKNOWN'
}

function describe(id: string, status: CardStatus): string {
  if (status === 'UNKNOWN') return '엘리베이터 운행 정보를 확인하지 못했어요.'
  const list = getElevators(id)
  if (!list.length) return '엘리베이터 목록을 확인하지 못했어요.'
  const ok = list.filter((e) => e.status === 'AVAILABLE').length
  return `엘리베이터 ${list.length}대 중 ${ok}대 정상 운행`
}

/**
 * 답변 액션에서 역 카드를 만든다. 역 데이터를 찾을 수 있는 openStation만 카드가 되고,
 * 같은 역은 한 번만 나온다. 카드로 바뀐 액션은 rest에서 빠진다(버튼은 카드 안의 '역 정보 보기'가 맡는다).
 */
export function buildStationCards(actions: ChatAction[]): { cards: StationCardData[]; rest: ChatAction[] } {
  const cards: StationCardData[] = []
  const seen = new Set<string>()
  const rest: ChatAction[] = []
  for (const a of actions) {
    const id = stationIdOfAction(a)
    const station = id ? getStation(id) : null
    if (!id || !station) { rest.push(a); continue }
    if (seen.has(id)) continue
    seen.add(id)
    const status = cardStatusOf(id)
    cards.push({ stationId: id, name: yeok(station), lines: station.lines || [], status, description: describe(id, status) })
  }
  return { cards, rest }
}
