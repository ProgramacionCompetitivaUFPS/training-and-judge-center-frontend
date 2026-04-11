import { describe, it, expect } from 'vitest'
import { createGroupSchema, updateGroupSchema, deleteGroupSchema } from './group'

describe('createGroupSchema', () => {
  const validData = {
    name: 'Study Group',
    visibility: 'VISIBLE' as const,
    joinPolicy: 'OPEN' as const,
  }

  it('accepts valid group data with required fields only', () => {
    const result = createGroupSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts valid group data with all optional fields', () => {
    const result = createGroupSchema.safeParse({
      ...validData,
      description: 'A study group for algorithms',
      initialLeadNicknames: ['leader1'],
      initialMemberNicknames: ['member1', 'member2'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name with Spanish message', () => {
    const result = createGroupSchema.safeParse({ ...validData, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameError?.message).toBe('El nombre es requerido')
    }
  })

  it('rejects name exceeding 100 characters', () => {
    const result = createGroupSchema.safeParse({ ...validData, name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameError?.message).toBe('El nombre no puede exceder 100 caracteres')
    }
  })

  it('rejects description exceeding 500 characters', () => {
    const result = createGroupSchema.safeParse({ ...validData, description: 'a'.repeat(501) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const descError = result.error.issues.find((i) => i.path.includes('description'))
      expect(descError?.message).toBe('La descripción no puede exceder 500 caracteres')
    }
  })

  it('rejects NOT_VISIBLE group with non-INVITE joinPolicy (cross-field validation)', () => {
    const result = createGroupSchema.safeParse({
      name: 'Secret Group',
      visibility: 'NOT_VISIBLE',
      joinPolicy: 'OPEN',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const joinError = result.error.issues.find((i) => i.path.includes('joinPolicy'))
      expect(joinError?.message).toBe('Los grupos no visibles solo permiten política de invitación')
    }
  })

  it('rejects NOT_VISIBLE group with REQUEST joinPolicy', () => {
    const result = createGroupSchema.safeParse({
      name: 'Secret Group',
      visibility: 'NOT_VISIBLE',
      joinPolicy: 'REQUEST',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const joinError = result.error.issues.find((i) => i.path.includes('joinPolicy'))
      expect(joinError?.message).toBe('Los grupos no visibles solo permiten política de invitación')
    }
  })

  it('accepts NOT_VISIBLE group with INVITE joinPolicy', () => {
    const result = createGroupSchema.safeParse({
      name: 'Secret Group',
      visibility: 'NOT_VISIBLE',
      joinPolicy: 'INVITE',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid visibility value', () => {
    const result = createGroupSchema.safeParse({ ...validData, visibility: 'INVALID' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const visError = result.error.issues.find((i) => i.path.includes('visibility'))
      expect(visError?.message).toBe('Selecciona la visibilidad')
    }
  })

  it('rejects invalid joinPolicy value', () => {
    const result = createGroupSchema.safeParse({ ...validData, joinPolicy: 'INVALID' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const jpError = result.error.issues.find((i) => i.path.includes('joinPolicy'))
      expect(jpError?.message).toBe('Selecciona la política de ingreso')
    }
  })
})

describe('updateGroupSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateGroupSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with name only', () => {
    const result = updateGroupSchema.safeParse({ name: 'Updated Group' })
    expect(result.success).toBe(true)
  })

  it('rejects name exceeding 100 characters', () => {
    const result = updateGroupSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameError?.message).toBe('El nombre no puede exceder 100 caracteres')
    }
  })

  it('rejects description exceeding 500 characters', () => {
    const result = updateGroupSchema.safeParse({ description: 'a'.repeat(501) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const descError = result.error.issues.find((i) => i.path.includes('description'))
      expect(descError?.message).toBe('La descripción no puede exceder 500 caracteres')
    }
  })
})

describe('deleteGroupSchema', () => {
  it('accepts valid confirmation name', () => {
    const result = deleteGroupSchema.safeParse({ confirmationName: 'Study Group' })
    expect(result.success).toBe(true)
  })

  it('rejects empty confirmation name with Spanish message', () => {
    const result = deleteGroupSchema.safeParse({ confirmationName: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path.includes('confirmationName'))
      expect(error?.message).toBe('Escribe el nombre del grupo para confirmar')
    }
  })
})
