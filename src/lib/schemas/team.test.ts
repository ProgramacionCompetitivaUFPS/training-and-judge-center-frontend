import { describe, it, expect } from 'vitest'
import { createTeamSchema, inviteTeamMemberSchema } from './team'

describe('createTeamSchema', () => {
  it('accepts valid team name', () => {
    const result = createTeamSchema.safeParse({ name: 'Team Alpha' })
    expect(result.success).toBe(true)
  })

  it('rejects missing name with Spanish message', () => {
    const result = createTeamSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameError?.message).toBe('El nombre del equipo es requerido')
    }
  })

  it('rejects name exceeding 100 characters', () => {
    const result = createTeamSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameError?.message).toBe('El nombre no puede exceder 100 caracteres')
    }
  })

  it('rejects name that is only whitespace', () => {
    const result = createTeamSchema.safeParse({ name: '   ' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameError?.message).toBe('El nombre no puede ser solo espacios en blanco')
    }
  })
})

describe('inviteTeamMemberSchema', () => {
  it('accepts valid nickname', () => {
    const result = inviteTeamMemberSchema.safeParse({ nickname: 'john_doe' })
    expect(result.success).toBe(true)
  })

  it('rejects missing nickname with Spanish message', () => {
    const result = inviteTeamMemberSchema.safeParse({ nickname: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nickError = result.error.issues.find((i) => i.path.includes('nickname'))
      expect(nickError?.message).toBe('El nickname es requerido')
    }
  })
})
