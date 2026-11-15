// 답변 근거 데이터의 수집 시각(metadata.data_updated_at, ISO-8601 +09:00)을 KST 표기로 바꾼다.
// 오프셋이 없는 값이나 해석할 수 없는 값은 null이다. 시각을 지어내지 않고, 기기 시간대와 무관하게 Asia/Seoul로 쓴다.
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/

const KST_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "2026-11-15T10:13:00Z" -> "2026.11.15 19:13 수집". 잘못된 값이면 null. */
export function formatCollectedAt(iso: string | null | undefined): string | null {
  const value = typeof iso === 'string' ? iso.trim() : ''
  if (!ISO_WITH_OFFSET.test(value)) return null
  const ms = Date.parse(value)
  if (Number.isNaN(ms)) return null
  const parts: Record<string, string> = {}
  for (const part of KST_PARTS.formatToParts(new Date(ms))) parts[part.type] = part.value
  if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute) return null
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute} 수집`
}
