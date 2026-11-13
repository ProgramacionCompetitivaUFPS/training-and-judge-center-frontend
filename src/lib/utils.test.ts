import { describe, it, expect } from 'vitest'
import { cn, formatDuration, pluralize, problemLabel, formatBytes, participationModeLabel, formatDateTz, localDayStartIso } from './utils'

describe('cn', () => {
  it('merges class names', () => expect(cn('a', 'b')).toBe('a b'))
  it('resolves tailwind conflicts', () => expect(cn('p-2', 'p-4')).toBe('p-4'))
  it('filters falsy values', () => expect(cn('a', false, undefined, 'b')).toBe('a b'))
})

describe('formatDuration', () => {
  it('returns "0min" for 0 seconds', () => expect(formatDuration(0)).toBe('0min'))
  it('formats minutes only', () => expect(formatDuration(1800)).toBe('30min'))
  it('formats hours only', () => expect(formatDuration(7200)).toBe('2h'))
  it('formats hours and minutes', () => expect(formatDuration(5400)).toBe('1h 30min'))
  it('formats days only', () => expect(formatDuration(86400)).toBe('1 día'))
  it('formats days + hours', () => expect(formatDuration(108000)).toBe('1 día 6h'))
  it('formats days + minutes', () => expect(formatDuration(88200)).toBe('1 día 30min'))
  it('formats 7 days', () => expect(formatDuration(604800)).toBe('7 días'))
})

describe('pluralize', () => {
  it('returns singular for 1', () => expect(pluralize(1, 'problema')).toBe('1 problema'))
  it('returns plural for 0', () => expect(pluralize(0, 'problema')).toBe('0 problemas'))
  it('returns plural for 2', () => expect(pluralize(2, 'problema')).toBe('2 problemas'))
  it('uses custom plural', () => expect(pluralize(2, 'vez', 'veces')).toBe('2 veces'))
})

describe('problemLabel', () => {
  it('converts 1 to A', () => expect(problemLabel(1)).toBe('A'))
  it('converts 26 to Z', () => expect(problemLabel(26)).toBe('Z'))
  it('converts 27 to AA', () => expect(problemLabel(27)).toBe('AA'))
  it('converts 52 to AZ', () => expect(problemLabel(52)).toBe('AZ'))
  it('returns input as string for 0', () => expect(problemLabel(0)).toBe('0'))
})

describe('formatBytes', () => {
  it('formats bytes', () => expect(formatBytes(500)).toBe('500 B'))
  it('boundary: 1023 bytes stays as B', () => expect(formatBytes(1023)).toBe('1023 B'))
  it('boundary: 1024 bytes is 1.0 KB', () => expect(formatBytes(1024)).toBe('1.0 KB'))
  it('formats kilobytes', () => expect(formatBytes(1536)).toBe('1.5 KB'))
  it('formats megabytes', () => expect(formatBytes(2097152)).toBe('2.0 MB'))
})

describe('participationModeLabel', () => {
  it('maps INDIVIDUAL', () => expect(participationModeLabel('INDIVIDUAL')).toBe('Individual'))
  it('maps TEAM', () => expect(participationModeLabel('TEAM')).toBe('Por equipos'))
  it('maps MIXED', () => expect(participationModeLabel('MIXED')).toBe('Mixto'))
  it('returns unknown mode as-is', () => expect(participationModeLabel('UNKNOWN')).toBe('UNKNOWN'))
})

describe('formatDateTz', () => {
  const ISO = '2026-03-15T12:00:00Z'

  it('returns a non-empty string', () => {
    expect(formatDateTz(ISO, { timeZone: 'UTC' })).toBeTruthy()
  })

  it('includes UTC timezone abbreviation when timeZone is UTC', () => {
    expect(formatDateTz(ISO, { timeZone: 'UTC' })).toMatch(/UTC/)
  })

  it('includes the year in the output', () => {
    expect(formatDateTz(ISO, { timeZone: 'UTC' })).toMatch(/2026/)
  })

  it('short format is shorter than long format', () => {
    const long = formatDateTz(ISO, { timeZone: 'UTC' })
    const short = formatDateTz(ISO, { short: true, timeZone: 'UTC' })
    expect(short.length).toBeLessThan(long.length)
  })

  it('short format includes the timezone abbreviation', () => {
    const result = formatDateTz(ISO, { short: true, timeZone: 'UTC' })
    expect(result).toMatch(/UTC/)
  })
})

describe('localDayStartIso', () => {
  it('returns local midnight for a date string', () => {
    const result = localDayStartIso('2026-10-21')
    const d = new Date(result)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(9) // October = 9 (0-indexed)
    expect(d.getDate()).toBe(21)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
  })

  it('shifts forward by addDays', () => {
    const base = new Date(localDayStartIso('2026-10-21'))
    const next = new Date(localDayStartIso('2026-10-21', 1))
    expect(next.getDate()).toBe(base.getDate() + 1)
  })

  it('returns a valid ISO string without milliseconds', () => {
    expect(localDayStartIso('2026-10-21')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })
})
