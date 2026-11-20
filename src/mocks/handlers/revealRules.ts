import { HttpResponse } from 'msw'

import { computeContestStatus, mockContestReveals } from '../data'
import type { ContestDetail } from '@/types/contest'

/** Congelamiento y revelado de un contest según el backend: inicio del freeze, revelado manual o automático y si sigue congelado ahora. */
export function freezeStateOf(contest: ContestDetail, nowMs = Date.now()) {
  const status = computeContestStatus(contest.startTime, contest.endTime)
  const freezeStartMs = contest.freezeMinutes != null ? Date.parse(contest.endTime) - contest.freezeMinutes * 60_000 : null
  const hasFreeze = (contest.freezeMinutes ?? 0) > 0
  const autoRevealAt =
    hasFreeze && contest.autoRevealMinutes != null
      ? new Date(Date.parse(contest.endTime) + contest.autoRevealMinutes * 60_000).toISOString()
      : null
  const resultsRevealedAt =
    mockContestReveals.get(contest.id) ?? (autoRevealAt !== null && nowMs >= Date.parse(autoRevealAt) ? autoRevealAt : null)

  let isFrozen = false
  if (status === 'ACTIVE') isFrozen = freezeStartMs !== null && nowMs >= freezeStartMs
  else if (status === 'FINISHED') isFrozen = hasFreeze && resultsRevealedAt === null

  return { isFrozen, freezeStartMs, resultsRevealedAt, autoRevealAt }
}

/** Respuesta de rechazo del endpoint de revelado (404, 403, 409) o null si la revelación procede. */
export function revealRejection(contest: ContestDetail | undefined, groupId: string, isPrivileged: boolean): Response | null {
  if (!contest || contest.group.id !== groupId) {
    return HttpResponse.json({ error: 'CONTEST_NOT_FOUND', message: 'Competencia no encontrada' }, { status: 404 })
  }
  if (!isPrivileged) {
    return HttpResponse.json(
      { error: 'INSUFFICIENT_PERMISSIONS', message: 'No tienes permisos para revelar los resultados' },
      { status: 403 },
    )
  }
  if (computeContestStatus(contest.startTime, contest.endTime) !== 'FINISHED') {
    return HttpResponse.json({ error: 'CONTEST_NOT_FINISHED', message: 'Contest has not finished' }, { status: 409 })
  }
  if ((contest.freezeMinutes ?? 0) === 0) {
    return HttpResponse.json({ error: 'CONTEST_HAS_NO_FREEZE', message: 'Contest has no freeze' }, { status: 409 })
  }
  return null
}
