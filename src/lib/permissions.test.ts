import { describe, it, expect } from 'vitest'

import type { UserRole } from '@/types/user'
import type { GroupRole } from '@/types/group'

import { isGroupLeadOrAdmin } from './permissions'

describe('isGroupLeadOrAdmin', () => {
  it.each<[UserRole | undefined, GroupRole | null | undefined, boolean]>([
    ['ADMIN', 'LEAD', true],
    ['ADMIN', 'MEMBER', true],
    ['ADMIN', null, true],
    ['ADMIN', undefined, true],
    ['COACH', 'LEAD', true],
    ['CONTESTANT', 'LEAD', true],
    ['COACH', 'MEMBER', false],
    ['COACH', null, false],
    ['CONTESTANT', 'MEMBER', false],
    [undefined, 'MEMBER', false],
    [undefined, undefined, false],
  ])('con rol del sistema %s y rol de grupo %s devuelve %s', (systemRole, groupRole, expected) => {
    // Arrange / Act
    const result = isGroupLeadOrAdmin(systemRole, groupRole)

    // Assert
    expect(result).toBe(expected)
  })
})
