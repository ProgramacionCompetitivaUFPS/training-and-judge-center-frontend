export const DEFAULT_BALLOON_COLOR = '#ffffff'

const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

export function isValidBalloonColor(value: unknown): value is string {
  return typeof value === 'string' && COLOR_PATTERN.test(value)
}

export function resolveBalloonColor(color: string | null | undefined): string {
  if (isValidBalloonColor(color)) return color.toLowerCase()
  return DEFAULT_BALLOON_COLOR
}
