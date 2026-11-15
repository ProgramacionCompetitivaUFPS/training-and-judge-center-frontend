import { describe, it, expect } from 'vitest'

import { createGroupSchema, updateGroupSchema, deleteGroupSchema } from './group'

const validCreate = {
  name: 'ICPC Colombia',
  visibility: 'VISIBLE' as const,
  joinPolicy: 'OPEN' as const,
}

// ─── createGroupSchema ─────────────────────────────────────────────────────────

describe('createGroupSchema — name', () => {
  it('pasa con datos válidos mínimos', () => {
    expect(createGroupSchema.safeParse(validCreate).success).toBe(true)
  })

  it('falla con nombre vacío', () => {
    const r = createGroupSchema.safeParse({ ...validCreate, name: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('El nombre es requerido')
  })

  it('falla con nombre de más de 100 caracteres', () => {
    expect(
      createGroupSchema.safeParse({ ...validCreate, name: 'a'.repeat(101) }).success,
    ).toBe(false)
  })
})

describe('createGroupSchema — description', () => {
  it('acepta descripción opcional ausente', () => {
    expect(createGroupSchema.safeParse(validCreate).success).toBe(true)
  })

  it('falla con descripción de más de 500 caracteres', () => {
    expect(
      createGroupSchema.safeParse({ ...validCreate, description: 'x'.repeat(501) }).success,
    ).toBe(false)
  })
})

describe('createGroupSchema — enums', () => {
  it('falla con visibility inválida', () => {
    expect(
      createGroupSchema.safeParse({ ...validCreate, visibility: 'HIDDEN' }).success,
    ).toBe(false)
  })

  it('falla con joinPolicy inválida', () => {
    expect(
      createGroupSchema.safeParse({ ...validCreate, joinPolicy: 'RANDOM' }).success,
    ).toBe(false)
  })
})

describe('createGroupSchema — refinement: NOT_VISIBLE solo permite INVITE', () => {
  it('pasa con NOT_VISIBLE + INVITE', () => {
    expect(
      createGroupSchema.safeParse({
        ...validCreate,
        visibility: 'NOT_VISIBLE',
        joinPolicy: 'INVITE',
      }).success,
    ).toBe(true)
  })

  it('falla con NOT_VISIBLE + OPEN', () => {
    const r = createGroupSchema.safeParse({
      ...validCreate,
      visibility: 'NOT_VISIBLE',
      joinPolicy: 'OPEN',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toContain('joinPolicy')
    expect(r.error?.issues[0].message).toBe(
      'Los grupos no visibles solo permiten política de invitación',
    )
  })

  it('falla con NOT_VISIBLE + REQUEST', () => {
    const r = createGroupSchema.safeParse({
      ...validCreate,
      visibility: 'NOT_VISIBLE',
      joinPolicy: 'REQUEST',
    })
    expect(r.success).toBe(false)
  })
})

// ─── updateGroupSchema ─────────────────────────────────────────────────────────

describe('updateGroupSchema', () => {
  it('pasa con objeto vacío (todos opcionales)', () => {
    expect(updateGroupSchema.safeParse({}).success).toBe(true)
  })

  it('falla con nombre vacío si se provee', () => {
    expect(updateGroupSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('acepta solo cambiar joinPolicy', () => {
    expect(updateGroupSchema.safeParse({ joinPolicy: 'REQUEST' }).success).toBe(true)
  })
})

// ─── deleteGroupSchema ─────────────────────────────────────────────────────────

describe('deleteGroupSchema', () => {
  it('pasa con confirmationName no vacío', () => {
    expect(deleteGroupSchema.safeParse({ confirmationName: 'ICPC Colombia' }).success).toBe(true)
  })

  it('falla con confirmationName vacío', () => {
    const r = deleteGroupSchema.safeParse({ confirmationName: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Escribe el nombre del grupo para confirmar')
  })
})
