// 데모는 sessionStorage, 실제 계정은 서버 DB를 쓴다. 실제 계정 캐시는 메모리에만 둔다.
import { useSyncExternalStore } from 'react'
import { Auth } from '../../legacy/services'
import { allStations } from '../../lib/stations'

export const FAV_KEY = 'elevSubway.demoFavorites.v1'
const listeners = new Set<() => void>()
let version = 0
let serverFavorites: Favorite[] = []
let owner: string | undefined
let generation = 0
export const realAuth = () => window.APP_CONFIG?.authMode === 'real'
const userId = () => { const s = Auth()?.getSession(); return s ? s.id : undefined }
const notify = () => { version += 1; listeners.forEach((fn) => fn()) }
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** 같은 탭에서 추가·이름 변경·삭제한 즐겨찾기를 챗봇에도 즉시 반영한다. */
export function useFavorites(): Favorite[] {
  useSyncExternalStore(subscribe, () => version)
  return loadFavs()
}

export interface Favorite {
  id: string
  placeName: string
  alias?: string
  stationId?: string
  [k: string]: unknown
}

export function loadFavs(): Favorite[] {
  if (realAuth()) return owner && owner === userId() ? serverFavorites : []
  try {
    const saved = JSON.parse(sessionStorage.getItem(FAV_KEY) || '[]')
    return Array.isArray(saved)
      ? saved.filter((fav) => fav && typeof fav.id === 'string' && typeof fav.placeName === 'string')
      : []
  } catch { return [] }
}

export function saveFavs(list: Favorite[]) {
  if (realAuth()) throw new Error('실제 계정의 즐겨찾기는 서버에 저장해야 합니다.')
  try { sessionStorage.setItem(FAV_KEY, JSON.stringify(list)) } catch { /* 저장 불가 */ }
  notify()
}

export function clearFavorites() {
  generation += 1
  owner = undefined
  serverFavorites = []
  if (!realAuth()) saveFavs([])
  else notify()
}

type ServerFavorite = { id: string; place_name: string; station_id: number | null; alias: string | null }
function fromServer(fav: ServerFavorite): Favorite {
  return { id: fav.id, placeName: fav.place_name, alias: fav.alias || '',
    stationId: fav.station_id == null ? undefined : window.StationIdMap?.toSlug(fav.station_id) }
}

async function request(path: string, options?: { method?: string; body?: unknown }) {
  const auth = Auth()
  if (!auth?.request || !userId()) throw new Error('로그인이 필요해요.')
  return auth.request(path, options)
}

export async function fetchFavorites() {
  if (!realAuth()) return
  const account = userId()
  const current = ++generation
  if (owner !== account) { owner = account; serverFavorites = []; notify() }
  await window.StationIdMap.load()
  if (current !== generation || account !== userId()) return
  const data = await request('/api/me/favorites') as { items: ServerFavorite[] }
  if (current !== generation || account !== userId()) return
  serverFavorites = data.items.map(fromServer)
  notify()
}

export async function addFavorite(placeName: string) {
  if (!realAuth()) {
    saveFavs([...loadFavs(), { id: genFavId(), placeName, alias: '' }])
    return
  }
  const account = userId()
  // ID 매핑을 먼저 준비한다. 실패하면 다른 역이나 임시 저장으로 전환하지 않는다.
  await window.StationIdMap.load()
  if (account !== userId()) return
  const normalize = (name: string) => name.trim().replace(/역$/, '')
  const matches = allStations().filter((s) => normalize(s.name) === normalize(placeName))
  const stationId = matches.length === 1 ? window.StationIdMap.toBeId(matches[0].id) : undefined
  if (matches.length === 1 && stationId === undefined) throw new Error('아직 서버에 연결되지 않은 역이에요.')
  const saved = await request('/api/me/favorites', { method: 'POST', body: { place_name: placeName, station_id: stationId ?? null } }) as ServerFavorite
  if (account !== userId()) return
  owner = account
  generation += 1
  serverFavorites = [...serverFavorites, fromServer(saved)]
  notify()
}

export async function renameFavorite(id: string, alias: string) {
  if (!realAuth()) { saveFavs(loadFavs().map((f) => f.id === id ? { ...f, alias } : f)); return }
  const account = userId()
  const saved = await request('/api/me/favorites/' + encodeURIComponent(id), { method: 'PATCH', body: { alias } }) as ServerFavorite
  if (account !== userId()) return
  generation += 1
  serverFavorites = serverFavorites.map((f) => f.id === id ? fromServer(saved) : f)
  notify()
}

export async function deleteFavorite(id: string) {
  if (!realAuth()) { saveFavs(loadFavs().filter((f) => f.id !== id)); return }
  const account = userId()
  await request('/api/me/favorites/' + encodeURIComponent(id), { method: 'DELETE' })
  if (account !== userId()) return
  generation += 1
  serverFavorites = serverFavorites.filter((f) => f.id !== id)
  notify()
}

export function genFavId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// 글자 크기(localStorage). index.html이 로드 때 먼저 적용한다.
export const FONTSIZE_KEY = 'elevSubway.fontSize.v1'
export const FONTSIZE_LEVELS = ['normal', 'lg', 'xl', 'max'] as const
export type FontLevel = (typeof FONTSIZE_LEVELS)[number]

export function readFontSize(): FontLevel {
  let stored = 'normal'
  try { stored = localStorage.getItem(FONTSIZE_KEY) || 'normal' } catch { /* 저장소 사용 불가 */ }
  return (FONTSIZE_LEVELS as readonly string[]).includes(stored) ? (stored as FontLevel) : 'normal'
}

export function applyFontSize(level: string): FontLevel {
  const lv: FontLevel = (FONTSIZE_LEVELS as readonly string[]).includes(level) ? (level as FontLevel) : 'normal'
  if (lv === 'normal') document.documentElement.removeAttribute('data-fontsize')
  else document.documentElement.setAttribute('data-fontsize', lv)
  try { localStorage.setItem(FONTSIZE_KEY, lv) } catch { /* 저장소 사용 불가 */ }
  return lv
}
