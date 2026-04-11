import { describe, it, expect } from 'vitest'
import { createMaterialSchema, updateMaterialSchema } from './material'

describe('createMaterialSchema', () => {
  it('accepts valid material data with required fields only', () => {
    const result = createMaterialSchema.safeParse({ title: 'Intro to Algorithms' })
    expect(result.success).toBe(true)
  })

  it('accepts valid material data with all optional fields', () => {
    const result = createMaterialSchema.safeParse({
      title: 'Intro to Algorithms',
      content: 'This is the content of the material.',
      tags: ['algorithms', 'intro'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing title with Spanish message', () => {
    const result = createMaterialSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const titleError = result.error.issues.find((i) => i.path.includes('title'))
      expect(titleError?.message).toBe('El título es requerido')
    }
  })

  it('rejects title exceeding 200 characters', () => {
    const result = createMaterialSchema.safeParse({ title: 'a'.repeat(201) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const titleError = result.error.issues.find((i) => i.path.includes('title'))
      expect(titleError?.message).toBe('El título debe tener máximo 200 caracteres')
    }
  })

  it('rejects content exceeding 50000 characters', () => {
    const result = createMaterialSchema.safeParse({ title: 'Title', content: 'a'.repeat(50001) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const contentError = result.error.issues.find((i) => i.path.includes('content'))
      expect(contentError?.message).toBe('El contenido debe tener máximo 50000 caracteres')
    }
  })

  it('rejects tag shorter than 2 characters', () => {
    const result = createMaterialSchema.safeParse({ title: 'Title', tags: ['a'] })
    expect(result.success).toBe(false)
    if (!result.success) {
      const tagError = result.error.issues.find((i) => i.path[0] === 'tags')
      expect(tagError?.message).toBe('El tag debe tener al menos 2 caracteres')
    }
  })

  it('rejects tag exceeding 50 characters', () => {
    const result = createMaterialSchema.safeParse({ title: 'Title', tags: ['a'.repeat(51)] })
    expect(result.success).toBe(false)
    if (!result.success) {
      const tagError = result.error.issues.find((i) => i.path[0] === 'tags')
      expect(tagError?.message).toBe('El tag debe tener máximo 50 caracteres')
    }
  })

  it('rejects tag with invalid characters', () => {
    const result = createMaterialSchema.safeParse({ title: 'Title', tags: ['Bad Tag!'] })
    expect(result.success).toBe(false)
    if (!result.success) {
      const tagError = result.error.issues.find((i) => i.path[0] === 'tags')
      expect(tagError?.message).toBe('Solo letras minúsculas, números, guiones y guiones bajos')
    }
  })

  it('rejects tag with consecutive hyphens', () => {
    const result = createMaterialSchema.safeParse({ title: 'Title', tags: ['bad--tag'] })
    expect(result.success).toBe(false)
    if (!result.success) {
      const tagError = result.error.issues.find((i) => i.path[0] === 'tags')
      expect(tagError?.message).toBe('No se permiten guiones o guiones bajos consecutivos')
    }
  })

  it('rejects tag with consecutive underscores', () => {
    const result = createMaterialSchema.safeParse({ title: 'Title', tags: ['bad__tag'] })
    expect(result.success).toBe(false)
    if (!result.success) {
      const tagError = result.error.issues.find((i) => i.path[0] === 'tags')
      expect(tagError?.message).toBe('No se permiten guiones o guiones bajos consecutivos')
    }
  })
})

describe('updateMaterialSchema', () => {
  it('accepts valid update data with title only', () => {
    const result = updateMaterialSchema.safeParse({ title: 'Updated Title' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object (title is optional)', () => {
    const result = updateMaterialSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects title exceeding 200 characters', () => {
    const result = updateMaterialSchema.safeParse({ title: 'a'.repeat(201) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const titleError = result.error.issues.find((i) => i.path.includes('title'))
      expect(titleError?.message).toBe('El título debe tener máximo 200 caracteres')
    }
  })

  it('rejects content exceeding 50000 characters', () => {
    const result = updateMaterialSchema.safeParse({ content: 'a'.repeat(50001) })
    expect(result.success).toBe(false)
    if (!result.success) {
      const contentError = result.error.issues.find((i) => i.path.includes('content'))
      expect(contentError?.message).toBe('El contenido debe tener máximo 50000 caracteres')
    }
  })
})
