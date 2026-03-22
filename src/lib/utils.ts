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
 * Format a duration in seconds to a human-readable string.
 * e.g. 7200 → "2h", 5400 → "1h 30min", 1800 → "30min"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`
  if (hours > 0) return `${hours}h`
  return `${minutes}min`
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
