import { HttpResponse } from 'msw'
import type { ContestDetail } from '@/types/contest'
import { getRegistrationAvailability } from '@/lib/contestRegistration'
import { computeContestStatus } from '../data'

/** 409 que el backend devuelve al inscribirse cuando la regla de inscripción está cerrada; null si se puede. */
export function registrationClosedResponse(contest: ContestDetail): Response | null {
  const status = computeContestStatus(contest.startTime, contest.endTime)
  if (getRegistrationAvailability({ status, allowLateRegistration: contest.allowLateRegistration }) !== 'closed') {
    return null
  }
  if (status === 'FINISHED') {
    return HttpResponse.json(
      { error: 'CONTEST_NOT_OPEN_FOR_REGISTRATION', message: 'Contest is not open for registration' },
      { status: 409 },
    )
  }
  return HttpResponse.json(
    { error: 'CONTEST_ALREADY_STARTED', message: 'Contest has already started' },
    { status: 409 },
  )
}

/** 409 que el backend devuelve al desinscribirse fuera de SCHEDULED; null si se puede. */
export function unregisterNotAllowedResponse(contest: ContestDetail): Response | null {
  if (computeContestStatus(contest.startTime, contest.endTime) === 'SCHEDULED') return null
  return HttpResponse.json(
    { error: 'CANNOT_UNREGISTER_AFTER_START', message: 'Cannot unregister after the contest has started' },
    { status: 409 },
  )
}
