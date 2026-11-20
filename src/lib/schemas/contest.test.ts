import { describe, it, expect } from 'vitest'

import { createContestSchema, updateContestSchema } from './contest'

const START = '2027-06-01T10:00'
const END = '2027-06-01T12:00'   // 2 hours after START

const validBase = {
  name: 'Competencia Test',
  startTime: START,
  endTime: END,
}

// ─── createContestSchema ───────────────────────────────────────────────────────

describe('createContestSchema — name', () => {
  it('pasa con datos mínimos válidos', () => {
    expect(createContestSchema.safeParse(validBase).success).toBe(true)
  })

  it('falla con nombre vacío', () => {
    const r = createContestSchema.safeParse({ ...validBase, name: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('El nombre es requerido')
  })

  it('falla con nombre de más de 200 caracteres', () => {
    expect(
      createContestSchema.safeParse({ ...validBase, name: 'a'.repeat(201) }).success,
    ).toBe(false)
  })
})

describe('createContestSchema — startTime / endTime', () => {
  it('falla con startTime vacío', () => {
    const r = createContestSchema.safeParse({ ...validBase, startTime: '' })
    expect(r.success).toBe(false)
  })

  it('falla con endTime vacío', () => {
    const r = createContestSchema.safeParse({ ...validBase, endTime: '' })
    expect(r.success).toBe(false)
  })
})

describe('createContestSchema — penalty', () => {
  it('acepta penalty 0', () => {
    expect(createContestSchema.safeParse({ ...validBase, penalty: 0 }).success).toBe(true)
  })

  it('acepta penalty máximo 1440', () => {
    expect(createContestSchema.safeParse({ ...validBase, penalty: 1440 }).success).toBe(true)
  })

  it('falla con penalty negativo', () => {
    expect(createContestSchema.safeParse({ ...validBase, penalty: -1 }).success).toBe(false)
  })

  it('falla con penalty mayor a 1440', () => {
    expect(createContestSchema.safeParse({ ...validBase, penalty: 1441 }).success).toBe(false)
  })
})

describe('createContestSchema — refinement: endAfterStart', () => {
  it('falla cuando endTime es igual a startTime', () => {
    const r = createContestSchema.safeParse({ ...validBase, endTime: START })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toContain('endTime')
    expect(r.error?.issues[0].message).toBe('La fecha de fin debe ser posterior a la fecha de inicio')
  })

  it('falla cuando endTime es anterior a startTime', () => {
    const r = createContestSchema.safeParse({
      ...validBase,
      startTime: '2027-06-01T12:00',
      endTime: '2027-06-01T10:00',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toContain('endTime')
  })
})

describe('createContestSchema — refinement: freezeShorterThanDuration', () => {
  it('acepta freeze menor que la duración (110 min de 120)', () => {
    expect(
      createContestSchema.safeParse({ ...validBase, freezeMinutes: 110 }).success,
    ).toBe(true)
  })

  it('falla cuando freeze es igual a la duración (120 min de 120)', () => {
    const r = createContestSchema.safeParse({ ...validBase, freezeMinutes: 120 })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toContain('freezeMinutes')
  })

  it('falla cuando freeze excede la duración', () => {
    const r = createContestSchema.safeParse({ ...validBase, freezeMinutes: 200 })
    expect(r.success).toBe(false)
  })
})

describe('createContestSchema — refinement: teamSizes (TEAM/MIXED mode)', () => {
  it('pasa en modo INDIVIDUAL sin teamSize', () => {
    expect(
      createContestSchema.safeParse({ ...validBase, participationMode: 'INDIVIDUAL' }).success,
    ).toBe(true)
  })

  it('pasa en modo TEAM con teamSizeMin y teamSizeMax definidos', () => {
    expect(
      createContestSchema.safeParse({
        ...validBase,
        participationMode: 'TEAM',
        teamSizeMin: 2,
        teamSizeMax: 4,
      }).success,
    ).toBe(true)
  })

  it('falla en modo TEAM sin teamSizeMin/Max', () => {
    const r = createContestSchema.safeParse({ ...validBase, participationMode: 'TEAM' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toContain('teamSizeMax')
  })

  it('falla cuando teamSizeMax es menor que teamSizeMin', () => {
    const r = createContestSchema.safeParse({
      ...validBase,
      participationMode: 'TEAM',
      teamSizeMin: 4,
      teamSizeMax: 2,
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.path.includes('teamSizeMax'))).toBe(true)
  })
})

// ─── updateContestSchema ───────────────────────────────────────────────────────

describe('updateContestSchema', () => {
  it('pasa con objeto vacío (todos los campos son opcionales)', () => {
    expect(updateContestSchema.safeParse({}).success).toBe(true)
  })

  it('falla con nombre vacío si se provee', () => {
    expect(updateContestSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('aplica refinement endAfterStart cuando ambas fechas se proveen', () => {
    const r = updateContestSchema.safeParse({
      startTime: '2027-06-01T12:00',
      endTime: '2027-06-01T10:00',
    })
    expect(r.success).toBe(false)
  })

  it('no aplica refinement endAfterStart cuando solo se provee una fecha', () => {
    expect(updateContestSchema.safeParse({ endTime: END }).success).toBe(true)
  })
})

// ─── autoReveal ────────────────────────────────────────────────────────────────

const AUTO_REVEAL_DELAY_MESSAGE = 'Ingresa los minutos de espera (entero, mínimo 1)'

describe('createContestSchema — autoReveal', () => {
  it('falla en modo minutos sin minutos de espera', () => {
    const r = createContestSchema.safeParse({ ...validBase, freezeMinutes: 30, autoRevealMode: 'delay' })

    expect(r.success).toBe(false)
    expect(r.error?.issues.map((issue) => issue.message)).toContain(AUTO_REVEAL_DELAY_MESSAGE)
  })

  it.each([0, 1.5, -5])('falla en modo minutos con una espera de %s', (delay) => {
    const r = createContestSchema.safeParse({ ...validBase, freezeMinutes: 30, autoRevealMode: 'delay', autoRevealDelay: delay })

    expect(r.success).toBe(false)
  })

  it('acepta modo minutos con una espera de 45', () => {
    const r = createContestSchema.safeParse({ ...validBase, freezeMinutes: 30, autoRevealMode: 'delay', autoRevealDelay: 45 })

    expect(r.success).toBe(true)
  })

  it.each(['manual', 'onFinish'] as const)('no bloquea el envío en modo %s aunque los minutos estén vacíos', (mode) => {
    const r = createContestSchema.safeParse({ ...validBase, autoRevealMode: mode, autoRevealDelay: '' })

    expect(r.success).toBe(true)
  })

  it.each([0, null, undefined, -5])('no exige minutos de espera si el freeze es %s (el campo está oculto)', (freezeMinutes) => {
    const r = createContestSchema.safeParse({ ...validBase, freezeMinutes, autoRevealMode: 'delay', autoRevealDelay: '' })

    expect(r.error?.issues.map((issue) => issue.message) ?? []).not.toContain(AUTO_REVEAL_DELAY_MESSAGE)
  })

  it('con freeze 0 y modo minutos vacío el formulario es válido', () => {
    const r = createContestSchema.safeParse({ ...validBase, freezeMinutes: 0, autoRevealMode: 'delay', autoRevealDelay: '' })

    expect(r.success).toBe(true)
  })
})

describe('updateContestSchema — autoReveal', () => {
  it('falla en modo minutos sin minutos de espera', () => {
    const r = updateContestSchema.safeParse({ freezeMinutes: 30, autoRevealMode: 'delay' })

    expect(r.success).toBe(false)
    expect(r.error?.issues.map((issue) => issue.message)).toContain(AUTO_REVEAL_DELAY_MESSAGE)
  })

  it('acepta modo minutos con una espera de 45', () => {
    const r = updateContestSchema.safeParse({ freezeMinutes: 30, autoRevealMode: 'delay', autoRevealDelay: 45 })

    expect(r.success).toBe(true)
  })

  it('no bloquea la actualización en modo manual aunque los minutos estén vacíos', () => {
    const r = updateContestSchema.safeParse({ autoRevealMode: 'manual', autoRevealDelay: '' })

    expect(r.success).toBe(true)
  })

  it.each([0, null, undefined, -5])('no exige minutos de espera si el freeze es %s (el campo está oculto)', (freezeMinutes) => {
    const r = updateContestSchema.safeParse({ freezeMinutes, autoRevealMode: 'delay', autoRevealDelay: '' })

    expect(r.error?.issues.map((issue) => issue.message) ?? []).not.toContain(AUTO_REVEAL_DELAY_MESSAGE)
  })
})
