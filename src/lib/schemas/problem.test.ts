import { describe, it, expect } from 'vitest'
import { createProblemSchema, updateProblemSchema, deleteProblemSchema } from './problem'

describe('createProblemSchema', () => {
  const validData = {
    slug: 'two-sum',
    title: 'Two Sum',
  }

  it('accepts valid problem data with required fields only', () => {
    const result = createProblemSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts valid problem data with all optional fields', () => {
    const result = createProblemSchema.safeParse({
      ...validData,
      statement: 'Given an array of integers...',
      timeLimit: 2000,
      memoryLimit: 256,
      tags: 'arrays,hash-map',
      languageOverrides: [{ language: 'python', timeLimit: 4000 }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects slug shorter than 3 characters', () => {
    const result = createProblemSchema.safeParse({ ...validData, slug: 'ab' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const slugError = result.error.issues.find((i) => i.path.includes('slug'))
      expect(slugError?.message).toBe('El slug debe tener al menos 3 caracteres')
    }
  })

  it('rejects slug exceeding 70 characters', () => {
    const result = createProblemSchema.safeParse({ ...validData, slug: 'a'.repeat(71) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const slugError = result.error.issues.find((i) => i.path.includes('slug'))
      expect(slugError?.message).toBe('El slug no puede exceder 70 caracteres')
    }
  })

  it('rejects slug with invalid characters', () => {
    const result = createProblemSchema.safeParse({ ...validData, slug: 'Bad Slug!' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const slugError = result.error.issues.find((i) => i.path.includes('slug'))
      expect(slugError?.message).toBe('Solo letras minúsculas, números y guiones. No puede iniciar/terminar con guión.')
    }
  })

  it('rejects slug with consecutive hyphens', () => {
    const result = createProblemSchema.safeParse({ ...validData, slug: 'two--sum' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const slugError = result.error.issues.find((i) => i.path.includes('slug'))
      expect(slugError?.message).toBe('No puede contener guiones consecutivos')
    }
  })

  it('rejects missing title with Spanish message', () => {
    const result = createProblemSchema.safeParse({ slug: 'valid-slug', title: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const titleError = result.error.issues.find((i) => i.path.includes('title'))
      expect(titleError?.message).toBe('El título es requerido')
    }
  })

  it('rejects title exceeding 200 characters', () => {
    const result = createProblemSchema.safeParse({ ...validData, title: 'a'.repeat(201) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const titleError = result.error.issues.find((i) => i.path.includes('title'))
      expect(titleError?.message).toBe('El título no puede exceder 200 caracteres')
    }
  })

  it('rejects timeLimit below 1', () => {
    const result = createProblemSchema.safeParse({ ...validData, timeLimit: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path.includes('timeLimit'))
      expect(error?.message).toBe('Mínimo 1 ms')
    }
  })

  it('rejects timeLimit above 300000', () => {
    const result = createProblemSchema.safeParse({ ...validData, timeLimit: 300001 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path.includes('timeLimit'))
      expect(error?.message).toBe('Máximo 300000 ms')
    }
  })

  it('rejects memoryLimit below 1', () => {
    const result = createProblemSchema.safeParse({ ...validData, memoryLimit: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path.includes('memoryLimit'))
      expect(error?.message).toBe('Mínimo 1 MiB')
    }
  })

  it('rejects memoryLimit above 2048', () => {
    const result = createProblemSchema.safeParse({ ...validData, memoryLimit: 2049 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path.includes('memoryLimit'))
      expect(error?.message).toBe('Máximo 2048 MiB')
    }
  })

  it('rejects non-integer timeLimit', () => {
    const result = createProblemSchema.safeParse({ ...validData, timeLimit: 1.5 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path.includes('timeLimit'))
      expect(error?.message).toBe('Debe ser un número entero')
    }
  })
})


describe('updateProblemSchema', () => {
  it('accepts valid update data', () => {
    const result = updateProblemSchema.safeParse({ title: 'Updated Title' })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = updateProblemSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const titleError = result.error.issues.find((i) => i.path.includes('title'))
      expect(titleError?.message).toBe('El título es requerido')
    }
  })

  it('accepts optional accessibility field', () => {
    const result = updateProblemSchema.safeParse({ title: 'Title', accessibility: 'PUBLIC' })
    expect(result.success).toBe(true)
  })
})

describe('deleteProblemSchema', () => {
  it('accepts valid confirmation slug', () => {
    const result = deleteProblemSchema.safeParse({ confirmSlug: 'two-sum' })
    expect(result.success).toBe(true)
  })

  it('rejects empty confirmation slug with Spanish message', () => {
    const result = deleteProblemSchema.safeParse({ confirmSlug: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const error = result.error.issues.find((i) => i.path.includes('confirmSlug'))
      expect(error?.message).toBe('Escribe el slug del problema para confirmar')
    }
  })
})
