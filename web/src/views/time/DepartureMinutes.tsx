import './departure-minutes.css'
import { defaultMinuteDraft, minuteError, minuteFields, toMinuteDraft, type MinuteDraft } from './departureMinuteValues'

export function DepartureMinutes({ value, onChange, showErrors }: {
  value: MinuteDraft; onChange: (next: MinuteDraft) => void; showErrors: boolean
}) {
  const valid = minuteFields.every((f) => !minuteError(value[f.key], f.max))
  const presets = window.TimeCalculator.getDeparturePresets()
  const selected = presets.find((preset) => valid && minuteFields.every((field) => Number(value[field.key]) === preset.minutes[field.key]))
  return <>
    <fieldset className="departure-presets" aria-describedby="departurePresetHelp departurePresetLimit">
      <legend>어떻게 이동하고 싶으세요?</legend>
      <p className="departure-minutes-note" id="departurePresetHelp">정확한 시간을 몰라도 괜찮아요. 모르면 ‘천천히, 여유 있게 가요’로 계산해 보세요.</p>
      <div className="departure-preset-options">{presets.map((preset) =>
        <button type="button" className="departure-preset" key={preset.id} data-departure-preset={preset.id}
          aria-pressed={selected?.id === preset.id} onClick={() => onChange(toMinuteDraft(preset.minutes))}>
          <span className="departure-preset-title">{preset.label}</span>
          <span className="departure-preset-description">{preset.description}</span>
        </button>)}</div>
      <p className="departure-minutes-note" id="departurePresetLimit">선택에 맞춘 예상값이에요. 실제 거리와 현장 상황에 따라 달라질 수 있어요.</p>
      {!selected ? <p className="departure-minutes-note" role="status">직접 수정한 시간을 사용해요.</p> : null}
    </fieldset>
    <details className="departure-minutes" id="departureMinutes">
    <summary>예상 시간 직접 수정</summary>
      <p className="departure-minutes-summary">{valid
        ? `역까지 ${value.walkToStationMinutes}분 · 역 안 ${value.stationEntryMinutes}분 · 하차 후 ${value.exitWalkMinutes}분 · 여유 ${value.bufferMinutes}분`
        : '입력한 시간을 확인해 주세요'}</p>
    <p className="departure-minutes-note">평소 걸리는 시간을 알면 바꿔 주세요. 몸 상태나 장애 정도는 입력하지 않아도 돼요.</p>
    <div className="departure-minutes-fields">{minuteFields.map((field) => {
      const error = showErrors ? minuteError(value[field.key], field.max) : ''
      return <div className="departure-minutes-field" key={field.key}>
        <label htmlFor={field.key}>{field.label} (분)</label>
        <input id={field.key} type="number" inputMode="numeric" min="0" max={field.max} step="1" required
          value={value[field.key]} aria-invalid={!!error} aria-describedby={`${field.key}Hint${error ? ` ${field.key}Error` : ''}`}
          onChange={(e) => onChange({ ...value, [field.key]: e.target.value })} />
        <span id={`${field.key}Hint`} className="departure-minutes-note">{field.hint} · 0~{field.max}분</span>
        {error ? <span id={`${field.key}Error`} className="departure-minutes-error">{error}</span> : null}
      </div>
    })}</div>
    <button type="button" className="btn btn-ghost" onClick={() => onChange(defaultMinuteDraft())}>자동 예상 시간으로 되돌리기</button>
    <p className="departure-minutes-note">입력한 시간은 이 화면에서만 유지돼요. 이동 속도나 환승 시간을 자동으로 판단하지 않아요.</p>
  </details></>
}
