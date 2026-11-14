import type { Favorite } from '../account/favorites'
import type { Station } from '../../legacy/globals'

const normalize = (name: string) => name.trim().replace(/역$/, '')

/** 장소나 별칭으로 주변 역을 추측하지 않는다. 역 ID 또는 정확히 일치하는 역명만 쓴다. */
export function favoriteSuggestions(favorites: Favorite[], stations: Station[]) {
  const seen = new Set<string>()
  return favorites.flatMap((favorite) => {
    const matches = favorite.stationId
      ? stations.filter((station) => station.id === favorite.stationId)
      : stations.filter((station) => normalize(station.name) === normalize(favorite.placeName))
    if (matches.length !== 1) return []
    const station = matches[0]
    if (seen.has(station.id)) return []
    seen.add(station.id)
    const name = /역$/.test(station.name) ? station.name : station.name + '역'
    const prompt = `${name} 엘리베이터 알려줘`
    return [{ id: station.id, prompt, label: favorite.alias ? `${favorite.alias} · ${prompt}` : prompt }]
  })
}
