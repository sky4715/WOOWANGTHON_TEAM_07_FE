import { describe, expect, it } from 'vitest'
import { favoriteSuggestions } from './favoriteSuggestions'
import type { Station } from '../../legacy/globals'

const stations: Station[] = [
  { id: 'gangnam', name: '강남', x: 0, y: 0, lines: ['2'] },
  { id: 'seoul', name: '서울역', x: 0, y: 0, lines: ['1', '4'] },
]

describe('즐겨찾기 역 추천', () => {
  it('별칭은 표시하고 실제 역명으로 질문하며 중복 역은 한 번만 보여 준다', () => {
    expect(favoriteSuggestions([
      { id: '1', placeName: '강남역', alias: '회사' },
      { id: '2', placeName: '강남' },
      { id: '3', placeName: '우리집', stationId: 'seoul' },
    ], stations)).toEqual([
      { id: 'gangnam', prompt: '강남역 엘리베이터 알려줘', label: '회사 · 강남역 엘리베이터 알려줘' },
      { id: 'seoul', prompt: '서울역 엘리베이터 알려줘', label: '서울역 엘리베이터 알려줘' },
    ])
  })

  it('장소·부분 일치·모호한 역·유효하지 않은 ID에서는 역을 추측하지 않는다', () => {
    expect(favoriteSuggestions([
      { id: '1', placeName: '코엑스', alias: '강남역' },
      { id: '2', placeName: '강' },
      { id: '3', placeName: '강남역', stationId: 'missing' },
    ], stations)).toEqual([])
    expect(favoriteSuggestions([{ id: '1', placeName: '강남' }], [
      ...stations, { ...stations[0], id: 'other' },
    ])).toEqual([])
  })
})
