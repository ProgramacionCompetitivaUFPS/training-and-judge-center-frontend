import type { ContestDetail } from '@/types/contest'

/**
 * - `open`: se puede inscribir (competencia programada).
 * - `late`: se puede inscribir aunque ya esté en curso (ACTIVE con inscripción tardía habilitada).
 * - `closed`: no se puede inscribir.
 */
export type RegistrationAvailability = 'open' | 'late' | 'closed'

/** Única fuente de la regla «¿se puede inscribir?». */
export function getRegistrationAvailability(
  contest: Pick<ContestDetail, 'status' | 'allowLateRegistration'>,
): RegistrationAvailability {
  if (contest.status === 'SCHEDULED') return 'open'
  if (contest.status === 'ACTIVE' && contest.allowLateRegistration) return 'late'
  return 'closed'
}
