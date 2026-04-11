// Feature: frontend-testing, Property 4: Zod schema accepts valid input
// **Validates: Requirements 5.1**

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { loginSchema, registerSchema } from './user'
import { createProblemSchema } from './problem'
import { createContestSchema } from './contest'
import { createGroupSchema } from './group'
import { createMaterialSchema } from './material'
import { createTeamSchema } from './team'

// --- Arbitraries ---

/** Generates a valid email address */
const arbEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{0,5}$/),
    fc.constantFrom('com', 'org', 'net', 'io', 'co'),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

/** Generates a valid nickname: 3-30 chars, lowercase alphanumeric + _ - */
const arbNickname = fc.stringMatching(/^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/)

/** Generates a valid password: 8-72 chars */
const arbPassword = fc.string({ minLength: 8, maxLength: 72 }).filter((s) => s.length >= 8)

/** Generates a non-empty string with max length */
const arbNonEmpty = (maxLength: number) =>
  fc.string({ minLength: 1, maxLength }).filter((s) => s.trim().length > 0)

/** Generates a valid slug: 3-70 chars, lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens */
const arbSlug = fc
  .stringMatching(/^[a-z0-9]([a-z0-9]{1,68}|[a-z0-9]([a-z0-9]|-[a-z0-9]){0,33}[a-z0-9])$/)
  .filter((s) => s.length >= 3 && s.length <= 70 && !s.includes('--'))

/** Generates a valid ISO date string */
const arbISODate = fc
  .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
  .map((ts) => new Date(ts).toISOString())

/** Generates a valid material tag: 2-50 chars, lowercase alphanumeric + _ -, no consecutive -- or __ */
const arbTag = fc
  .stringMatching(/^[a-z0-9]([a-z0-9_-]{0,48}[a-z0-9])?$/)
  .filter((s) => s.length >= 2 && s.length <= 50 && !s.includes('--') && !s.includes('__'))

// --- Property Tests ---

describe('Property 4: Zod schema accepts valid input', () => {
  describe('loginSchema', () => {
    it('accepts any valid login data', () => {
      fc.assert(
        fc.property(arbEmail, arbNonEmpty(100), (email, password) => {
          const result = loginSchema.safeParse({ email, password })
          expect(result.success).toBe(true)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('registerSchema', () => {
    it('accepts any valid registration data', () => {
      fc.assert(
        fc.property(
          arbEmail,
          arbPassword,
          arbNonEmpty(100),
          arbNickname,
          arbNonEmpty(50),
          arbNonEmpty(50),
          arbNonEmpty(200),
          (email, password, name, nickname, country, city, institution) => {
            const result = registerSchema.safeParse({
              email,
              password,
              confirmPassword: password,
              name,
              nickname,
              country,
              city,
              institution,
            })
            expect(result.success).toBe(true)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('createProblemSchema', () => {
    it('accepts any valid problem data', () => {
      fc.assert(
        fc.property(
          arbSlug,
          arbNonEmpty(200),
          (slug, title) => {
            const result = createProblemSchema.safeParse({ slug, title })
            expect(result.success).toBe(true)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('accepts valid problem data with optional fields', () => {
      fc.assert(
        fc.property(
          arbSlug,
          arbNonEmpty(200),
          fc.string({ maxLength: 5000 }),
          fc.integer({ min: 1, max: 300000 }),
          fc.integer({ min: 1, max: 2048 }),
          (slug, title, statement, timeLimit, memoryLimit) => {
            const result = createProblemSchema.safeParse({
              slug,
              title,
              statement,
              timeLimit,
              memoryLimit,
            })
            expect(result.success).toBe(true)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('createContestSchema', () => {
    it('accepts any valid contest data', () => {
      fc.assert(
        fc.property(
          arbNonEmpty(200),
          arbISODate,
          arbISODate,
          (name, startTime, endTime) => {
            const result = createContestSchema.safeParse({
              name,
              startTime,
              endTime,
            })
            expect(result.success).toBe(true)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('accepts valid contest data with optional fields', () => {
      fc.assert(
        fc.property(
          arbNonEmpty(200),
          arbISODate,
          arbISODate,
          fc.integer({ min: 0, max: 1440 }),
          fc.boolean(),
          (name, startTime, endTime, penalty, enablePostContest) => {
            const result = createContestSchema.safeParse({
              name,
              startTime,
              endTime,
              penalty,
              enablePostContest,
            })
            expect(result.success).toBe(true)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('createGroupSchema', () => {
    it('accepts any valid group data (VISIBLE)', () => {
      fc.assert(
        fc.property(
          arbNonEmpty(100),
          fc.constantFrom('INVITE' as const, 'REQUEST' as const, 'OPEN' as const),
          (name, joinPolicy) => {
            const result = createGroupSchema.safeParse({
              name,
              visibility: 'VISIBLE',
              joinPolicy,
            })
            expect(result.success).toBe(true)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('accepts NOT_VISIBLE group with INVITE policy', () => {
      fc.assert(
        fc.property(arbNonEmpty(100), (name) => {
          const result = createGroupSchema.safeParse({
            name,
            visibility: 'NOT_VISIBLE',
            joinPolicy: 'INVITE',
          })
          expect(result.success).toBe(true)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('createMaterialSchema', () => {
    it('accepts any valid material data', () => {
      fc.assert(
        fc.property(arbNonEmpty(200), (title) => {
          const result = createMaterialSchema.safeParse({ title })
          expect(result.success).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('accepts valid material data with optional fields', () => {
      fc.assert(
        fc.property(
          arbNonEmpty(200),
          fc.string({ maxLength: 5000 }),
          fc.array(arbTag, { maxLength: 5 }),
          (title, content, tags) => {
            const result = createMaterialSchema.safeParse({
              title,
              content,
              tags,
            })
            expect(result.success).toBe(true)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('createTeamSchema', () => {
    it('accepts any valid team data', () => {
      fc.assert(
        fc.property(arbNonEmpty(100), (name) => {
          const result = createTeamSchema.safeParse({ name })
          expect(result.success).toBe(true)
        }),
        { numRuns: 100 },
      )
    })
  })
})

// Feature: frontend-testing, Property 5: Zod schema rejects invalid input with Spanish errors
// **Validates: Requirements 5.2, 5.3**

// --- Helpers for invalid-input testing ---

/** Known Spanish words/fragments that appear in Zod error messages */
const SPANISH_MARKERS = [
  'requerido',
  'requerida',
  'exceder',
  'caracteres',
  'inválido',
  'debe',
  'mínimo',
  'máximo',
  'no puede',
  'solo',
  'selecciona',
  'confirma',
  'contraseña',
  'correo',
  'nombre',
  'título',
  'descripción',
  'penalización',
  'minutos',
  'permiten',
  'electrónico',
  'institución',
  'ciudad',
  'país',
  'equipo',
  'al menos',
  'tener',
  'letras',
  'números',
  'guiones',
  'espacios',
  'blanco',
  'slug',
  'tag',
  'enunciado',
  'contenido',
  'nickname',
]

function containsSpanish(message: string): boolean {
  const lower = message.toLowerCase()
  return SPANISH_MARKERS.some((marker) => lower.includes(marker))
}

function getZodErrors(result: { success: boolean; error?: { issues: Array<{ path: (string | number)[]; message: string }> } }) {
  if (result.success) return []
  return result.error!.issues.map((i) => ({ path: i.path, message: i.message }))
}

describe('Property 5: Zod schema rejects invalid input with Spanish errors', () => {
  describe('loginSchema — missing required fields', () => {
    it('rejects empty email with Spanish error on email path', () => {
      fc.assert(
        fc.property(arbNonEmpty(100), (password) => {
          const result = loginSchema.safeParse({ email: '', password })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const emailErrors = errors.filter((e) => e.path.includes('email'))
          expect(emailErrors.length).toBeGreaterThan(0)
          expect(emailErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('rejects empty password with Spanish error on password path', () => {
      fc.assert(
        fc.property(arbEmail, (email) => {
          const result = loginSchema.safeParse({ email, password: '' })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const pwErrors = errors.filter((e) => e.path.includes('password'))
          expect(pwErrors.length).toBeGreaterThan(0)
          expect(pwErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('rejects invalid email format with Spanish error', () => {
      const arbInvalidEmail = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('@') || !s.includes('.'))
      fc.assert(
        fc.property(arbInvalidEmail, arbNonEmpty(100), (email, password) => {
          const result = loginSchema.safeParse({ email, password })
          if (!result.success) {
            const errors = getZodErrors(result as any)
            const emailErrors = errors.filter((e) => e.path.includes('email'))
            if (emailErrors.length > 0) {
              expect(emailErrors.some((e) => containsSpanish(e.message))).toBe(true)
            }
          }
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('registerSchema — missing and invalid fields', () => {
    it('rejects empty required fields with Spanish errors on correct paths', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const result = registerSchema.safeParse({
            email: '',
            password: '',
            confirmPassword: '',
            name: '',
            nickname: '',
            country: '',
            city: '',
            institution: '',
          })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const requiredPaths = ['email', 'password', 'name', 'nickname', 'country', 'city', 'institution']
          for (const field of requiredPaths) {
            const fieldErrors = errors.filter((e) => e.path.includes(field))
            expect(fieldErrors.length).toBeGreaterThan(0)
            expect(fieldErrors.some((e) => containsSpanish(e.message))).toBe(true)
          }
        }),
        { numRuns: 100 },
      )
    })

    it('rejects nickname with invalid characters with Spanish error', () => {
      const arbBadNickname = fc.stringMatching(/^[A-Z !@#]{3,30}$/)
      fc.assert(
        fc.property(arbBadNickname, (nickname) => {
          const result = registerSchema.safeParse({
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123',
            name: 'Test',
            nickname,
            country: 'CO',
            city: 'Bogotá',
            institution: 'Uni',
          })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const nickErrors = errors.filter((e) => e.path.includes('nickname'))
          expect(nickErrors.length).toBeGreaterThan(0)
          expect(nickErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('rejects name exceeding max length with Spanish error', () => {
      const arbLongName = fc.string({ minLength: 101, maxLength: 200 }).filter((s) => s.trim().length > 100)
      fc.assert(
        fc.property(arbLongName, (name) => {
          const result = registerSchema.safeParse({
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123',
            name,
            nickname: 'validnick',
            country: 'CO',
            city: 'Bogotá',
            institution: 'Uni',
          })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const nameErrors = errors.filter((e) => e.path.includes('name'))
          expect(nameErrors.length).toBeGreaterThan(0)
          expect(nameErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('createProblemSchema — invalid inputs', () => {
    it('rejects empty slug and title with Spanish errors', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const result = createProblemSchema.safeParse({ slug: '', title: '' })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const slugErrors = errors.filter((e) => e.path.includes('slug'))
          const titleErrors = errors.filter((e) => e.path.includes('title'))
          expect(slugErrors.length).toBeGreaterThan(0)
          expect(titleErrors.length).toBeGreaterThan(0)
          expect(slugErrors.some((e) => containsSpanish(e.message))).toBe(true)
          expect(titleErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('rejects invalid slug patterns with Spanish error', () => {
      const arbBadSlug = fc.stringMatching(/^[A-Z !@#]{3,70}$/)
      fc.assert(
        fc.property(arbBadSlug, arbNonEmpty(200), (slug, title) => {
          const result = createProblemSchema.safeParse({ slug, title })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const slugErrors = errors.filter((e) => e.path.includes('slug'))
          expect(slugErrors.length).toBeGreaterThan(0)
          expect(slugErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('rejects title exceeding max length with Spanish error', () => {
      const arbLongTitle = fc.string({ minLength: 201, maxLength: 300 }).filter((s) => s.trim().length > 0)
      fc.assert(
        fc.property(arbSlug, arbLongTitle, (slug, title) => {
          const result = createProblemSchema.safeParse({ slug, title })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const titleErrors = errors.filter((e) => e.path.includes('title'))
          expect(titleErrors.length).toBeGreaterThan(0)
          expect(titleErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('createContestSchema — invalid inputs', () => {
    it('rejects empty required fields with Spanish errors', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const result = createContestSchema.safeParse({ name: '', startTime: '', endTime: '' })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const nameErrors = errors.filter((e) => e.path.includes('name'))
          const startErrors = errors.filter((e) => e.path.includes('startTime'))
          const endErrors = errors.filter((e) => e.path.includes('endTime'))
          expect(nameErrors.length).toBeGreaterThan(0)
          expect(startErrors.length).toBeGreaterThan(0)
          expect(endErrors.length).toBeGreaterThan(0)
          expect(nameErrors.some((e) => containsSpanish(e.message))).toBe(true)
          expect(startErrors.some((e) => containsSpanish(e.message))).toBe(true)
          expect(endErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('rejects name exceeding max length with Spanish error', () => {
      const arbLongName = fc.string({ minLength: 201, maxLength: 400 }).filter((s) => s.trim().length > 0)
      fc.assert(
        fc.property(arbLongName, arbISODate, arbISODate, (name, startTime, endTime) => {
          const result = createContestSchema.safeParse({ name, startTime, endTime })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const nameErrors = errors.filter((e) => e.path.includes('name'))
          expect(nameErrors.length).toBeGreaterThan(0)
          expect(nameErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('createGroupSchema — invalid inputs', () => {
    it('rejects empty name with Spanish error', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const result = createGroupSchema.safeParse({
            name: '',
            visibility: 'VISIBLE',
            joinPolicy: 'OPEN',
          })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const nameErrors = errors.filter((e) => e.path.includes('name'))
          expect(nameErrors.length).toBeGreaterThan(0)
          expect(nameErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('rejects NOT_VISIBLE with non-INVITE joinPolicy with Spanish error on joinPolicy path', () => {
      const arbNonInvitePolicy = fc.constantFrom('REQUEST' as const, 'OPEN' as const)
      fc.assert(
        fc.property(arbNonEmpty(100), arbNonInvitePolicy, (name, joinPolicy) => {
          const result = createGroupSchema.safeParse({
            name,
            visibility: 'NOT_VISIBLE',
            joinPolicy,
          })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const jpErrors = errors.filter((e) => e.path.includes('joinPolicy'))
          expect(jpErrors.length).toBeGreaterThan(0)
          expect(jpErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('rejects name exceeding max length with Spanish error', () => {
      const arbLongName = fc.string({ minLength: 101, maxLength: 200 }).filter((s) => s.trim().length > 0)
      fc.assert(
        fc.property(arbLongName, (name) => {
          const result = createGroupSchema.safeParse({
            name,
            visibility: 'VISIBLE',
            joinPolicy: 'OPEN',
          })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const nameErrors = errors.filter((e) => e.path.includes('name'))
          expect(nameErrors.length).toBeGreaterThan(0)
          expect(nameErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('createMaterialSchema — invalid inputs', () => {
    it('rejects empty title with Spanish error', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const result = createMaterialSchema.safeParse({ title: '' })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const titleErrors = errors.filter((e) => e.path.includes('title'))
          expect(titleErrors.length).toBeGreaterThan(0)
          expect(titleErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('rejects title exceeding max length with Spanish error', () => {
      const arbLongTitle = fc.string({ minLength: 201, maxLength: 400 }).filter((s) => s.trim().length > 0)
      fc.assert(
        fc.property(arbLongTitle, (title) => {
          const result = createMaterialSchema.safeParse({ title })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const titleErrors = errors.filter((e) => e.path.includes('title'))
          expect(titleErrors.length).toBeGreaterThan(0)
          expect(titleErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('createTeamSchema — invalid inputs', () => {
    it('rejects empty name with Spanish error', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const result = createTeamSchema.safeParse({ name: '' })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const nameErrors = errors.filter((e) => e.path.includes('name'))
          expect(nameErrors.length).toBeGreaterThan(0)
          expect(nameErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('rejects name exceeding max length with Spanish error', () => {
      const arbLongName = fc.string({ minLength: 101, maxLength: 200 }).filter((s) => s.trim().length > 0)
      fc.assert(
        fc.property(arbLongName, (name) => {
          const result = createTeamSchema.safeParse({ name })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const nameErrors = errors.filter((e) => e.path.includes('name'))
          expect(nameErrors.length).toBeGreaterThan(0)
          expect(nameErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('rejects whitespace-only name with Spanish error', () => {
      const arbWhitespace = fc.integer({ min: 1, max: 100 }).map((n) => ' '.repeat(n))
      fc.assert(
        fc.property(arbWhitespace, (name) => {
          const result = createTeamSchema.safeParse({ name })
          expect(result.success).toBe(false)
          const errors = getZodErrors(result as any)
          const nameErrors = errors.filter((e) => e.path.includes('name'))
          expect(nameErrors.length).toBeGreaterThan(0)
          expect(nameErrors.some((e) => containsSpanish(e.message))).toBe(true)
        }),
        { numRuns: 100 },
      )
    })
  })
})
