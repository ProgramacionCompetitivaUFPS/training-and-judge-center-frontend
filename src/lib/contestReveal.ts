import type { ContestStatus } from '@/types/contest'

/** true si el contest terminó pero los resultados siguen congelados (botón «Revelar» y aviso). */
export function isAwaitingReveal(contest: { status?: ContestStatus; isFrozen?: boolean }): boolean {
  return contest.status === 'FINISHED' && contest.isFrozen === true
}
