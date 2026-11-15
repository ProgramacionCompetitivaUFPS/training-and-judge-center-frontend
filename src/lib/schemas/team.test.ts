import { describe, it, expect } from 'vitest'

import { createTeamSchema, inviteTeamMemberSchema } from './team'

// ─── createTeamSchema ──────────────────────────────────────────────────────────

describe('createTeamSchema', () => {
  it('pasa con nombre válido', () => {
    expect(createTeamSchema.safeParse({ name: 'Team Alpha' }).success).toBe(true)
  })

  it('falla con nombre vacío', () => {
    const r = createTeamSchema.safeParse({ name: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('El nombre del equipo es requerido')
  })

  it('falla con nombre de solo espacios en blanco', () => {
    const r = createTeamSchema.safeParse({ name: '   ' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('El nombre no puede ser solo espacios en blanco')
  })

  it('falla con nombre de más de 100 caracteres', () => {
    expect(createTeamSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false)
  })

  it('acepta nombre exactamente de 100 caracteres', () => {
    expect(createTeamSchema.safeParse({ name: 'a'.repeat(100) }).success).toBe(true)
  })
})

// ─── inviteTeamMemberSchema ────────────────────────────────────────────────────

describe('inviteTeamMemberSchema', () => {
  it('pasa con nickname válido', () => {
    expect(inviteTeamMemberSchema.safeParse({ nickname: 'luisadmin' }).success).toBe(true)
  })

  it('falla con nickname vacío', () => {
    const r = inviteTeamMemberSchema.safeParse({ nickname: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('El nickname es requerido')
  })
})
