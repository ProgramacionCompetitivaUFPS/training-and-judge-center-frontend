import { describe, it, expect } from 'vitest'
import { createContestSchema, updateContestSchema } from './contest'

describe('createContestSchema', () => {
  const validData = {
    name: 'Contest Alpha',
    startTime: '2025-06-01T10:00:00Z',
    endTime: '2025-06-01T15:00:00Z',
  }

  it('accepts valid contest data with required fields only', () => {
    const result = createContestSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts valid contest data with all optional fields', () => {
    const result = createContestSchema.safeParse({
      ...validData,
      description: 'A great contest',
      penalty: 20,
      freezeMinutes: 30,
      enablePostContest: true,
      problems: ['problem-1', 'problem-2'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name with Spanish message', () => {
    const result = createContestSchema.safeParse({ ...validData, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameError?.message).toBe('El nombre es requerido')
    }
  })

  it('rejects name exceeding 200 characters', () => {
    const result = createContestSchema.safeParse({ ...validData, name: 'a'.repeat(201) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameError?.message).toBe('El nombre no puede exceder 200 caracteres')
    }
  })

  it('rejects empty startTime with Spanish message', () => {
    const result = createContestSchema.safeParse({ name: 'Contest', startTime: '', endTime: '2025-06-01T15:00:00Z' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path.includes('startTime'))
      expect(error?.message).toBe('La fecha de inicio es requerida')
    }
  })

  it('rejects empty endTime with Spanish message', () => {
    const result = createContestSchema.safeParse({ name: 'Contest', startTime: '2025-06-01T10:00:00Z', endTime: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path.includes('endTime'))
      expect(error?.message).toBe('La fecha de fin es requerida')
    }
  })

  it('rejects description exceeding 5000 characters', () => {
    const result = createContestSchema.safeParse({ ...validData, description: 'a'.repeat(5001) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const descError = result.error.issues.find((i) => i.path.includes('description'))
      expect(descError?.message).toBe('La descripción no puede exceder 5000 caracteres')
    }
  })

  it('rejects penalty exceeding 1440', () => {
    const result = createContestSchema.safeParse({ ...validData, penalty: 1441 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const penaltyError = result.error.issues.find((i) => i.path.includes('penalty'))
      expect(penaltyError?.message).toBe('La penalización máxima es 1440 minutos')
    }
  })

  it('rejects negative penalty', () => {
    const result = createContestSchema.safeParse({ ...validData, penalty: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const penaltyError = result.error.issues.find((i) => i.path.includes('penalty'))
      expect(penaltyError?.message).toBe('La penalización mínima es 0')
    }
  })

  it('rejects negative freezeMinutes', () => {
    const result = createContestSchema.safeParse({ ...validData, freezeMinutes: -5 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const freezeError = result.error.issues.find((i) => i.path.includes('freezeMinutes'))
      expect(freezeError?.message).toBe('Los minutos de freeze deben ser positivos')
    }
  })
})

describe('updateContestSchema', () => {
  it('accepts empty object (all fields optional via partial)', () => {
    const result = updateContestSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with only name', () => {
    const result = updateContestSchema.safeParse({ name: 'Updated Contest' })
    expect(result.success).toBe(true)
  })

  it('rejects name exceeding 200 characters', () => {
    const result = updateContestSchema.safeParse({ name: 'a'.repeat(201) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameError?.message).toBe('El nombre no puede exceder 200 caracteres')
    }
  })
})
