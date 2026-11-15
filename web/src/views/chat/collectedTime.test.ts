import { afterEach, describe, expect, it } from 'vitest'
import { formatCollectedAt } from './collectedTime'

const originalTz = process.env.TZ
afterEach(() => { process.env.TZ = originalTz; if (originalTz === undefined) delete process.env.TZ })

describe('formatCollectedAt', () => {
  it('formats an ISO value with +09:00 as KST', () => {
    expect(formatCollectedAt('2026-11-15T19:13:00+09:00')).toBe('2026.11.15 19:13 수집')
  })

  it('converts a Z (UTC) value to KST', () => {
    expect(formatCollectedAt('2026-11-15T10:13:00Z')).toBe('2026.11.15 19:13 수집')
  })

  it('converts other offsets to KST and crosses the date boundary', () => {
    expect(formatCollectedAt('2026-11-15T00:30:00+01:00')).toBe('2026.11.15 08:30 수집')
    expect(formatCollectedAt('2026-11-14T23:50:00-05:00')).toBe('2026.11.15 13:50 수집')
    expect(formatCollectedAt('2026-12-31T23:59:59+09:00')).toBe('2026.12.31 23:59 수집')
  })

  it('gives the same result whatever the process time zone is', () => {
    const samples = ['2026-11-15T10:13:00Z', '2026-11-15T19:13:00+09:00']
    for (const tz of ['UTC', 'America/New_York', 'Asia/Kolkata', 'Asia/Seoul']) {
      process.env.TZ = tz
      for (const iso of samples) expect(formatCollectedAt(iso)).toBe('2026.11.15 19:13 수집')
    }
  })

  it('returns null for null, empty, unparseable, or offset-less values', () => {
    expect(formatCollectedAt(null)).toBeNull()
    expect(formatCollectedAt(undefined)).toBeNull()
    expect(formatCollectedAt('')).toBeNull()
    expect(formatCollectedAt('invalid')).toBeNull()
    expect(formatCollectedAt('2026-11-15 19:13')).toBeNull()
    expect(formatCollectedAt('2026-11-15T19:13:00')).toBeNull()
    expect(formatCollectedAt('2026-13-45T99:99:00+09:00')).toBeNull()
  })
})
