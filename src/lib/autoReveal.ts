/** Modo de revelado automático en la UI: manual, al terminar, o N minutos después del fin. */
export type AutoRevealMode = 'manual' | 'onFinish' | 'delay'

/** Modo de la UI a partir del `autoRevealMinutes` del API (null/undefined = manual, 0 = al terminar, N = espera). */
export function autoRevealModeOf(minutes: number | null | undefined): AutoRevealMode {
  if (minutes == null) return 'manual'
  return minutes === 0 ? 'onFinish' : 'delay'
}

/** Minutos de espera a mostrar en el input; undefined si no hay espera (null, 0). */
export function autoRevealDelayOf(minutes: number | null | undefined): number | undefined {
  return minutes != null && minutes > 0 ? minutes : undefined
}

/** `autoRevealMinutes` del API a partir del modo de la UI y los minutos de espera. */
export function toAutoRevealMinutes(mode: AutoRevealMode, delay: number | undefined): number | null {
  if (mode === 'manual') return null
  if (mode === 'onFinish') return 0
  return delay ?? null
}

/** El revelado solo existe con un freeze mayor que 0: negativos, vacío, null y NaN cuentan como sin freeze. */
export function isFreezeEnabled(freezeMinutes: number | string | null | undefined): boolean {
  return Number(freezeMinutes) > 0
}

/** Minutos de espera a partir del valor crudo del input; undefined si está vacío o no es un número. */
export function parseAutoRevealDelay(raw: string | number | null | undefined): number | undefined {
  if (raw === '' || raw == null) return undefined
  const value = Number(raw)
  return Number.isNaN(value) ? undefined : value
}

/** Modo y espera tal como los dejó la usuaria; se conservan juntos aunque el servidor cambie al recargar. */
export interface AutoRevealDraft {
  mode: AutoRevealMode
  delay: number | undefined
}

/** El borrador de la usuaria, o null si equivale a lo guardado (entonces no hay nada que conservar). */
export function autoRevealDraftOf(
  savedMinutes: number | null | undefined,
  mode: AutoRevealMode,
  delay: number | undefined,
): AutoRevealDraft | null {
  const unchanged = mode === autoRevealModeOf(savedMinutes) && toAutoRevealMinutes(mode, delay) === (savedMinutes ?? null)
  return unchanged ? null : { mode, delay }
}
