// AI 답변 중 역 정보 답변을 카드로 보여 준다 (#116).
// 카드는 AI 문장이 아니라 구조화된 데이터(openStation 액션의 역 ID + 앱의 역·엘리베이터 데이터)로만 채운다.
// 데이터가 없으면 상태는 '확인 필요'로 둔다. 모든 값은 React 텍스트 노드로만 들어간다(innerHTML 없음).
import { LineBadges } from '../../components/LineBadge'
import { Icon } from '../../components/Icon'
import { CARD_STATUS, type CardStatus, type StationCardData } from './stationCards'
import './station-cards.css'

function StatusBadge({ status }: { status: CardStatus }) {
  const s = CARD_STATUS[status]
  return <span className={'status-pill station-card-status ' + s.cls}><Icon name={s.icon} />{s.label}</span>
}

export function StationAnswerCards({ cards, onOpenStation }: { cards: StationCardData[]; onOpenStation: (stationId: string) => void }) {
  if (!cards.length) return null
  return (
    <ul className="station-cards" aria-label="역 정보">
      {cards.map((c) => (
        <li key={c.stationId} className="station-card">
          <div className="station-card-head">
            <span className="station-card-name">{c.name}</span>
            <span className="station-card-lines"><LineBadges station={{ lines: c.lines }} /></span>
          </div>
          <StatusBadge status={c.status} />
          <p className="station-card-desc">{c.description}</p>
          <button type="button" className="btn btn-sm btn-ghost station-card-open" onClick={() => onOpenStation(c.stationId)}>역 정보 보기</button>
        </li>
      ))}
    </ul>
  )
}
