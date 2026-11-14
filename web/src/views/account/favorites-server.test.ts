import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addFavorite, clearFavorites, deleteFavorite, fetchFavorites, loadFavs, renameFavorite } from './favorites'
import type { AuthSession } from '../../legacy/globals'

let session: AuthSession | false
const favorite = { id: 'f-1', place_name: '강남', station_id: 3, alias: '회사' }

beforeEach(() => {
  window.APP_CONFIG.authMode = 'real'
  session = { id: 'user-1', name: '사용자', csrf_token: 'test-csrf' }
  vi.spyOn(window.AuthService, 'getSession').mockImplementation(() => session)
  vi.spyOn(window.StationIdMap, 'load').mockResolvedValue({})
  vi.spyOn(window.StationIdMap, 'toBeId').mockReturnValue(3)
  vi.spyOn(window.StationIdMap, 'toSlug').mockReturnValue('gangnam')
  clearFavorites()
})
afterEach(() => { clearFavorites(); window.APP_CONFIG.authMode = 'demo'; vi.restoreAllMocks() })

describe('서버 계정 즐겨찾기', () => {
  it('서버에서 복원하고 별칭과 역 ID를 유지한다', async () => {
    vi.spyOn(window.AuthService, 'request').mockResolvedValue({ items: [favorite] })
    await fetchFavorites()
    expect(loadFavs()).toEqual([{ id: 'f-1', placeName: '강남', stationId: 'gangnam', alias: '회사' }])
    session = { id: 'other-user' }
    expect(loadFavs()).toEqual([])
  })

  it('추가·변경·삭제는 서버 성공 뒤 반영하고 실패하면 기존 값을 유지한다', async () => {
    const request = vi.spyOn(window.AuthService, 'request').mockResolvedValue({ items: [] })
    await fetchFavorites()
    request.mockResolvedValueOnce(favorite)
    await addFavorite('강남역')
    expect(request).toHaveBeenLastCalledWith('/api/me/favorites', { method: 'POST', body: { place_name: '강남역', station_id: 3 } })
    request.mockRejectedValueOnce(new Error('서버 저장 실패'))
    await expect(renameFavorite('f-1', '직장')).rejects.toThrow('서버 저장 실패')
    expect(loadFavs()[0].alias).toBe('회사')
    request.mockResolvedValueOnce({ ...favorite, alias: '직장' })
    await renameFavorite('f-1', '직장')
    expect(loadFavs()[0].alias).toBe('직장')
    request.mockResolvedValueOnce(null)
    await deleteFavorite('f-1')
    expect(loadFavs()).toEqual([])
  })

  it('로그아웃 뒤 도착한 이전 계정 응답을 버린다', async () => {
    let resolve!: (data: unknown) => void
    vi.spyOn(window.AuthService, 'request').mockImplementation(() => new Promise((done) => { resolve = done }))
    const pending = fetchFavorites()
    await Promise.resolve()
    session = false
    clearFavorites()
    resolve({ items: [favorite] })
    await pending
    expect(loadFavs()).toEqual([])
  })

  it('불러오기 실패로 기존 서버 목록을 비우거나 임시 저장으로 전환하지 않는다', async () => {
    const request = vi.spyOn(window.AuthService, 'request').mockResolvedValue({ items: [favorite] })
    await fetchFavorites()
    request.mockRejectedValueOnce(new Error('연결 실패'))
    await expect(fetchFavorites()).rejects.toThrow('연결 실패')
    expect(loadFavs()).toHaveLength(1)
  })
})
