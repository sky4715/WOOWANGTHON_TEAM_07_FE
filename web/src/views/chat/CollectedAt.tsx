// 봇 답변 말풍선 오른쪽 아래의 수집 시각 표시. 음성 텍스트에는 들어가지 않는다 (responseSpeechText는 답변 본문만 쓴다).
import { formatCollectedAt } from './collectedTime'
import './collected-at.css'

export function CollectedAt({ iso }: { iso: string | null | undefined }) {
  const label = formatCollectedAt(iso)
  if (!label) return null
  return <p className="answer-collected">{label}</p>
}
