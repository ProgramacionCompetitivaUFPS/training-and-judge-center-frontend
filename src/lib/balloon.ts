export const DEFAULT_BALLOON_COLOR = '#ffffff'

/** Atajos del selector de color. NO es el color por defecto: sin color se muestra blanco. */
export const BALLOON_PALETTE: readonly string[] = [
  '#e11d48', '#f97316', '#f59e0b', '#84cc16', '#16a34a', '#0d9488',
  '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#db2777', '#475569',
]

const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

export function isValidBalloonColor(value: unknown): value is string {
  return typeof value === 'string' && COLOR_PATTERN.test(value)
}

export function resolveBalloonColor(color: string | null | undefined): string {
  if (isValidBalloonColor(color)) return color.toLowerCase()
  return DEFAULT_BALLOON_COLOR
}

/** Color de texto (oscuro o blanco) que se lee bien sobre el fondo dado. */
export function readableTextColor(background: string | null | undefined): string {
  const hex = resolveBalloonColor(background)
  const n = parseInt(hex.slice(1), 16)
  const luminance = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)
  return luminance > 160 ? '#1c1517' : '#ffffff'
}
