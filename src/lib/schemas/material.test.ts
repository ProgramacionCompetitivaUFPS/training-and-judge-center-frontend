import { describe, it, expect } from 'vitest'

import { createMaterialSchema, updateMaterialSchema } from './material'

const validCreate = { title: 'Introducción a Grafos' }

// ─── createMaterialSchema — title ──────────────────────────────────────────────

describe('createMaterialSchema — title', () => {
  it('pasa con título válido', () => {
    expect(createMaterialSchema.safeParse(validCreate).success).toBe(true)
  })

  it('falla con título vacío', () => {
    const r = createMaterialSchema.safeParse({ title: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('El título es requerido')
  })

  it('falla con título de más de 200 caracteres', () => {
    expect(
      createMaterialSchema.safeParse({ title: 'a'.repeat(201) }).success,
    ).toBe(false)
  })
})

describe('createMaterialSchema — content', () => {
  it('acepta contenido vacío por defecto', () => {
    const r = createMaterialSchema.safeParse(validCreate)
    expect(r.success).toBe(true)
    expect(r.data?.content).toBe('')
  })

  it('falla con contenido de más de 50000 caracteres', () => {
    expect(
      createMaterialSchema.safeParse({ title: 'T', content: 'x'.repeat(50001) }).success,
    ).toBe(false)
  })
})

// ─── tagSchema (via createMaterialSchema) ─────────────────────────────────────

describe('createMaterialSchema — tags válidos', () => {
  it.each([
    ['dp'],
    ['graph-theory'],
    ['segment-tree'],
    ['a1b2'],
    ['tag_name'],
  ])('acepta tag válido "%s"', (tag) => {
    expect(createMaterialSchema.safeParse({ ...validCreate, tags: [tag] }).success).toBe(true)
  })
})

describe('createMaterialSchema — tags inválidos', () => {
  it.each([
    ['a', 'El tag debe tener al menos 2 caracteres'],
    ['AB', 'Solo letras minúsculas, números, guiones y guiones bajos'],
    ['Tag', 'Solo letras minúsculas, números, guiones y guiones bajos'],
    ['-start', 'Solo letras minúsculas, números, guiones y guiones bajos'],
    ['end-', 'Solo letras minúsculas, números, guiones y guiones bajos'],
  ])('falla con tag "%s"', (tag, expectedMsg) => {
    const r = createMaterialSchema.safeParse({ ...validCreate, tags: [tag] })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe(expectedMsg)
  })

  it('falla con tag que contiene guiones consecutivos (--)', () => {
    const r = createMaterialSchema.safeParse({ ...validCreate, tags: ['tag--bad'] })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('No se permiten guiones o guiones bajos consecutivos')
  })

  it('falla con tag que contiene guiones bajos consecutivos (__)', () => {
    const r = createMaterialSchema.safeParse({ ...validCreate, tags: ['tag__bad'] })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('No se permiten guiones o guiones bajos consecutivos')
  })

  it('falla con tag de más de 50 caracteres', () => {
    expect(
      createMaterialSchema.safeParse({ ...validCreate, tags: ['a'.repeat(51)] }).success,
    ).toBe(false)
  })
})

// ─── updateMaterialSchema ──────────────────────────────────────────────────────

describe('updateMaterialSchema', () => {
  it('pasa con objeto vacío (todos opcionales)', () => {
    expect(updateMaterialSchema.safeParse({}).success).toBe(true)
  })

  it('falla con título vacío si se provee', () => {
    expect(updateMaterialSchema.safeParse({ title: '' }).success).toBe(false)
  })

  it('aplica las mismas reglas de tags', () => {
    expect(updateMaterialSchema.safeParse({ tags: ['tag--bad'] }).success).toBe(false)
  })
})
