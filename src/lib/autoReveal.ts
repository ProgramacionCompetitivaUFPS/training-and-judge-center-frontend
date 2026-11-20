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
