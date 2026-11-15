import { describe, it, expect } from 'vitest'

import { createProblemSchema, updateProblemSchema, deleteProblemSchema } from './problem'

const validCreate = {
  slug: 'two-sum',
  title: 'Two Sum',
}

// ─── createProblemSchema — slug ────────────────────────────────────────────────

describe('createProblemSchema — slug válido', () => {
  it('pasa con slug mínimo válido (3 chars)', () => {
    expect(createProblemSchema.safeParse({ ...validCreate, slug: 'abc' }).success).toBe(true)
  })

  it('pasa con slug con guiones internos', () => {
    expect(createProblemSchema.safeParse({ ...validCreate, slug: 'two-sum-hard' }).success).toBe(true)
  })

  it('pasa con slug con números', () => {
    expect(createProblemSchema.safeParse({ ...validCreate, slug: 'problem-1' }).success).toBe(true)
  })
})

describe('createProblemSchema — slug inválido', () => {
  it('falla con slug menor a 3 caracteres', () => {
    const r = createProblemSchema.safeParse({ ...validCreate, slug: 'ab' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('El slug debe tener al menos 3 caracteres')
  })

  it('falla con slug de más de 70 caracteres', () => {
    expect(
      createProblemSchema.safeParse({ ...validCreate, slug: 'a'.repeat(71) }).success,
    ).toBe(false)
  })

  it.each([
    ['Two-Sum', 'Solo letras minúsculas, números y guiones. No puede iniciar/terminar con guión.'],
    ['-start', 'Solo letras minúsculas, números y guiones. No puede iniciar/terminar con guión.'],
    ['end-', 'Solo letras minúsculas, números y guiones. No puede iniciar/terminar con guión.'],
    ['has space', 'Solo letras minúsculas, números y guiones. No puede iniciar/terminar con guión.'],
    ['under_score', 'Solo letras minúsculas, números y guiones. No puede iniciar/terminar con guión.'],
  ])('falla con slug "%s" (formato inválido)', (slug, expectedMsg) => {
    const r = createProblemSchema.safeParse({ ...validCreate, slug })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe(expectedMsg)
  })

  it('falla con slug que contiene guiones consecutivos (--)', () => {
    const r = createProblemSchema.safeParse({ ...validCreate, slug: 'two--sum' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('No puede contener guiones consecutivos')
  })
})

// ─── createProblemSchema — title ───────────────────────────────────────────────

describe('createProblemSchema — title', () => {
  it('pasa con título válido', () => {
    expect(createProblemSchema.safeParse(validCreate).success).toBe(true)
  })

  it('falla con título vacío', () => {
    const r = createProblemSchema.safeParse({ ...validCreate, title: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('El título es requerido')
  })

  it('falla con título de más de 200 caracteres', () => {
    expect(
      createProblemSchema.safeParse({ ...validCreate, title: 'a'.repeat(201) }).success,
    ).toBe(false)
  })
})

// ─── createProblemSchema — timeLimit / memoryLimit ────────────────────────────

describe('createProblemSchema — timeLimit', () => {
  it('acepta timeLimit en rango válido', () => {
    expect(createProblemSchema.safeParse({ ...validCreate, timeLimit: 1000 }).success).toBe(true)
  })

  it('acepta timeLimit mínimo (1)', () => {
    expect(createProblemSchema.safeParse({ ...validCreate, timeLimit: 1 }).success).toBe(true)
  })

  it('acepta timeLimit máximo (300000)', () => {
    expect(createProblemSchema.safeParse({ ...validCreate, timeLimit: 300000 }).success).toBe(true)
  })

  it('falla con timeLimit 0', () => {
    expect(createProblemSchema.safeParse({ ...validCreate, timeLimit: 0 }).success).toBe(false)
  })

  it('falla con timeLimit mayor a 300000', () => {
    expect(createProblemSchema.safeParse({ ...validCreate, timeLimit: 300001 }).success).toBe(false)
  })
})

describe('createProblemSchema — memoryLimit', () => {
  it('acepta memoryLimit en rango válido', () => {
    expect(createProblemSchema.safeParse({ ...validCreate, memoryLimit: 256 }).success).toBe(true)
  })

  it('falla con memoryLimit 0', () => {
    expect(createProblemSchema.safeParse({ ...validCreate, memoryLimit: 0 }).success).toBe(false)
  })

  it('falla con memoryLimit mayor a 2048', () => {
    expect(createProblemSchema.safeParse({ ...validCreate, memoryLimit: 2049 }).success).toBe(false)
  })
})

// ─── updateProblemSchema ───────────────────────────────────────────────────────

describe('updateProblemSchema', () => {
  it('pasa con título válido', () => {
    expect(updateProblemSchema.safeParse({ title: 'New Title' }).success).toBe(true)
  })

  it('falla con título vacío', () => {
    expect(updateProblemSchema.safeParse({ title: '' }).success).toBe(false)
  })

  it('acepta accessibility PUBLIC o PRIVATE', () => {
    expect(updateProblemSchema.safeParse({ title: 'T', accessibility: 'PUBLIC' }).success).toBe(true)
    expect(updateProblemSchema.safeParse({ title: 'T', accessibility: 'PRIVATE' }).success).toBe(true)
  })

  it('falla con accessibility inválida', () => {
    expect(updateProblemSchema.safeParse({ title: 'T', accessibility: 'HIDDEN' }).success).toBe(false)
  })
})

// ─── deleteProblemSchema ───────────────────────────────────────────────────────

describe('deleteProblemSchema', () => {
  it('pasa con confirmSlug no vacío', () => {
    expect(deleteProblemSchema.safeParse({ confirmSlug: 'two-sum' }).success).toBe(true)
  })

  it('falla con confirmSlug vacío', () => {
    const r = deleteProblemSchema.safeParse({ confirmSlug: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Escribe el slug del problema para confirmar')
  })
})
