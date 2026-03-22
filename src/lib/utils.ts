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
