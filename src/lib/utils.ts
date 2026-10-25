import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Format a date string showing the user's local timezone abbreviation.
 * e.g. "21 mar 2026, 15:00 VET"
 */
export function formatDateTz(iso: string, options?: { short?: boolean }): string {
  const date = new Date(iso)
  const tz = Intl.DateTimeFormat('es', { timeZoneName: 'short' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value || ''

  if (options?.short) {
    const formatted = date.toLocaleDateString('es', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
    return `${formatted} ${tz}`
  }

  const formatted = date.toLocaleDateString('es', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  return `${formatted} ${tz}`
}


/**
 * Turn a local `YYYY-MM-DD` (what `<input type="date">` gives) into the RFC3339 instant of
 * that day's local midnight, optionally shifted by whole days.
 * e.g. ("2026-10-21") in UTC-5 → "2026-10-21T05:00:00Z"; ("2026-10-21", 1) → next midnight.
 */
export function localDayStartIso(day: string, addDays = 0): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d + addDays).toISOString().replace(/\.\d{3}Z$/, 'Z')
}


/**
 * Format a duration in seconds to a human-readable string, using days for long contests.
 * e.g. 7200 → "2h", 5400 → "1h 30min", 1800 → "30min", 604800 → "7 días", 108000 → "1 día 6h"
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) {
    const dayPart = `${days} ${days === 1 ? 'día' : 'días'}`
    return hours > 0 ? `${dayPart} ${hours}h` : dayPart
  }
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`
  if (hours > 0) return `${hours}h`
  return `${minutes}min`
}

/**
 * Convert a 1-based problem position to its letter label (A, B, ... Z, AA, AB, ...),
 * spreadsheet-column style so it never runs out past 26 problems.
 */
export function problemLabel(position: number): string {
  if (!Number.isInteger(position) || position < 1) return String(position)
  let n = position
  let label = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    label = String.fromCharCode(65 + rem) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

/**
 * Map a participation mode code to its Spanish label.
 */
export function participationModeLabel(mode: string): string {
  switch (mode) {
    case 'INDIVIDUAL': return 'Individual'
    case 'TEAM': return 'Por equipos'
    case 'MIXED': return 'Mixto'
    default: return mode
  }
}
