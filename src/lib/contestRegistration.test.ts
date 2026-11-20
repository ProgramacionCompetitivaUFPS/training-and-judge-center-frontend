import { describe, it, expect } from 'vitest'

import type { ContestStatus } from '@/types/contest'

import { getRegistrationAvailability, type RegistrationAvailability } from './contestRegistration'

describe('getRegistrationAvailability', () => {
  it.each<[ContestStatus, boolean, RegistrationAvailability]>([
    ['SCHEDULED', false, 'open'],
    ['SCHEDULED', true, 'open'],
    ['ACTIVE', true, 'late'],
    ['ACTIVE', false, 'closed'],
    ['FINISHED', true, 'closed'],
    ['FINISHED', false, 'closed'],
  ])('con estado %s y allowLateRegistration=%s devuelve %s', (status, allowLateRegistration, expected) => {
    expect(getRegistrationAvailability({ status, allowLateRegistration })).toBe(expected)
  })
})
