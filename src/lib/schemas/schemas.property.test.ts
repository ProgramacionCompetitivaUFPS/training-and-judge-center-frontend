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
