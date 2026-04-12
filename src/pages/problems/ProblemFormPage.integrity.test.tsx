import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen, waitFor, server } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { ProblemFormPage } from './ProblemFormPage'
import { ToastProvider } from '@/components/layout/ToastProvider'

const API_URL = 'http://localhost:8080/api'

/**
 * Helper: renders ProblemFormPage (create mode) wrapped with ToastProvider.
 */
function renderCreateForm() {
  return renderWithProviders(
    <ToastProvider>
      <ProblemFormPage />
    </ToastProvider>,
    { role: 'ADMIN', initialRoute: '/problems/new' },
  )
}

describe('ProblemFormPage — form data integrity', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  // Requirement 8.1: creation form sends request body matching API contract structure
  describe('creation form request body matches API contract', () => {
    it('sends slug, title, tags, and limits in the correct structure', async () => {
      let capturedBody: Record<string, unknown> | null = null

      server.use(
        http.post(`${API_URL}/problems`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(
            {
              slug: capturedBody.slug,
              title: capturedBody.title,
              statement: capturedBody.statement ?? null,
              inputFormat: null,
              outputFormat: null,
              examples: [],
              timeLimit: capturedBody.timeLimit ?? null,
              memoryLimit: capturedBody.memoryLimit ?? null,
              languageOverrides: capturedBody.languageOverrides ?? [],
              tags: capturedBody.tags ?? [],
              status: 'DRAFT',
              accessibility: 'PRIVATE',
              author: { nickname: 'luisadmin', name: 'Luis Admin' },
              modifiers: [{ nickname: 'luisadmin', name: 'Luis Admin' }],
              files: { testCases: false, solutions: [], checker: false, validator: false },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              problemJudgingUpdatedAt: null,
            },
            { status: 201 },
          )
        }),
      )

      const user = userEvent.setup()
      renderCreateForm()

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText('Slug'), 'two-sum')
      await user.type(screen.getByLabelText('Título'), 'Two Sum Problem')
      await user.type(screen.getByLabelText('Tiempo límite (ms)'), '2000')
      await user.type(screen.getByLabelText('Memoria límite (MiB)'), '256')

      await user.click(screen.getByRole('button', { name: 'Crear' }))

      await waitFor(() => {
        expect(capturedBody).not.toBeNull()
      })

      // Verify the request body matches the CreateProblemRequest contract
      expect(capturedBody).toHaveProperty('slug', 'two-sum')
      expect(capturedBody).toHaveProperty('title', 'Two Sum Problem')
      expect(capturedBody).toHaveProperty('timeLimit', 2000)
      expect(capturedBody).toHaveProperty('memoryLimit', 256)
      // tags should be an array (transformed from comma-separated string)
      expect(capturedBody).toHaveProperty('tags')
      expect(Array.isArray(capturedBody!.tags)).toBe(true)
      // languageOverrides should be an array
      expect(capturedBody).toHaveProperty('languageOverrides')
      expect(Array.isArray(capturedBody!.languageOverrides)).toBe(true)
    })
  })

  // Requirement 8.2: optional fields left empty are omitted or null, not empty strings
  describe('optional fields are omitted or null, not empty strings', () => {
    it('does not send empty strings for statement and tags when left blank', async () => {
      let capturedBody: Record<string, unknown> | null = null

      server.use(
        http.post(`${API_URL}/problems`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(
            {
              slug: capturedBody.slug,
              title: capturedBody.title,
              statement: null,
              inputFormat: null,
              outputFormat: null,
              examples: [],
              timeLimit: capturedBody.timeLimit ?? null,
              memoryLimit: capturedBody.memoryLimit ?? null,
              languageOverrides: [],
              tags: [],
              status: 'DRAFT',
              accessibility: 'PRIVATE',
              author: { nickname: 'luisadmin', name: 'Luis Admin' },
              modifiers: [{ nickname: 'luisadmin', name: 'Luis Admin' }],
              files: { testCases: false, solutions: [], checker: false, validator: false },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              problemJudgingUpdatedAt: null,
            },
            { status: 201 },
          )
        }),
      )

      const user = userEvent.setup()
      renderCreateForm()

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
      })

      // Fill required fields + timeLimit/memoryLimit (needed to pass Zod validation
      // because empty number inputs with valueAsNumber produce NaN)
      // Leave statement and tags empty — these are the truly optional fields
      await user.type(screen.getByLabelText('Slug'), 'minimal-problem')
      await user.type(screen.getByLabelText('Título'), 'Minimal Problem')
      await user.type(screen.getByLabelText('Tiempo límite (ms)'), '1000')
      await user.type(screen.getByLabelText('Memoria límite (MiB)'), '128')

      await user.click(screen.getByRole('button', { name: 'Crear' }))

      await waitFor(() => {
        expect(capturedBody).not.toBeNull()
      })

      // statement: should be omitted (undefined in JSON = absent key) or null, never ""
      if ('statement' in capturedBody!) {
        expect(capturedBody!.statement).not.toBe('')
      }

      // tags: should be an empty array or omitted, never an empty string
      expect(capturedBody).toHaveProperty('tags')
      expect(Array.isArray(capturedBody!.tags)).toBe(true)
      expect(capturedBody!.tags).not.toBe('')
      // No tag in the array should be an empty string
      for (const tag of capturedBody!.tags as string[]) {
        expect(tag).not.toBe('')
      }

      // languageOverrides: should be an empty array when none added
      expect(capturedBody).toHaveProperty('languageOverrides')
      expect(Array.isArray(capturedBody!.languageOverrides)).toBe(true)
      expect(capturedBody!.languageOverrides).toHaveLength(0)
    })
  })
})


// Feature: frontend-testing, Property 8: Form submission payload matches API contract
describe('ProblemFormPage — Property 8: Form submission payload matches API contract', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  /**
   * Validates: Requirements 8.1, 8.4
   *
   * For any valid slug and title generated by fast-check, when the creation form
   * is filled and submitted, the request body sent to the API must contain:
   * - slug as a string
   * - title as a string
   * - tags as an array
   * - languageOverrides as an array
   * - timeLimit as a number (when provided)
   * - memoryLimit as a number (when provided)
   */
  it('sends a request body matching the CreateProblemRequest contract for any valid slug and title', async () => {
    const fc = await import('fast-check')

    // Generator: valid slugs (lowercase alphanumeric, 3-12 chars)
    const slugArb = fc.stringMatching(/^[a-z0-9]{3,12}$/)

    // Generator: valid titles (letters + spaces, 1-15 chars, non-blank)
    const titleArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z ]{0,14}$/)

    await fc.assert(
      fc.asyncProperty(slugArb, titleArb, async (slug, title) => {
        let capturedBody: Record<string, unknown> | null = null

        server.use(
          http.post(`${API_URL}/problems`, async ({ request }) => {
            capturedBody = (await request.json()) as Record<string, unknown>
            return HttpResponse.json(
              {
                slug: capturedBody.slug,
                title: capturedBody.title,
                statement: capturedBody.statement ?? null,
                inputFormat: null,
                outputFormat: null,
                examples: [],
                timeLimit: capturedBody.timeLimit ?? null,
                memoryLimit: capturedBody.memoryLimit ?? null,
                languageOverrides: capturedBody.languageOverrides ?? [],
                tags: capturedBody.tags ?? [],
                status: 'DRAFT',
                accessibility: 'PRIVATE',
                author: { nickname: 'luisadmin', name: 'Luis Admin' },
                modifiers: [{ nickname: 'luisadmin', name: 'Luis Admin' }],
                files: { testCases: false, solutions: [], checker: false, validator: false },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                problemJudgingUpdatedAt: null,
              },
              { status: 201 },
            )
          }),
        )

        const user = userEvent.setup()
        const { unmount } = renderCreateForm()

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
        })

        // Fill form with generated values
        await user.type(screen.getByLabelText('Slug'), slug)
        await user.type(screen.getByLabelText('Título'), title)
        await user.type(screen.getByLabelText('Tiempo límite (ms)'), '1000')
        await user.type(screen.getByLabelText('Memoria límite (MiB)'), '256')

        await user.click(screen.getByRole('button', { name: 'Crear' }))

        await waitFor(() => {
          expect(capturedBody).not.toBeNull()
        })

        // Verify API contract structure
        expect(typeof capturedBody!.slug).toBe('string')
        expect(capturedBody!.slug).toBe(slug)
        expect(typeof capturedBody!.title).toBe('string')
        expect(capturedBody!.title).toBe(title)
        expect(typeof capturedBody!.timeLimit).toBe('number')
        expect(capturedBody!.timeLimit).toBe(1000)
        expect(typeof capturedBody!.memoryLimit).toBe('number')
        expect(capturedBody!.memoryLimit).toBe(256)
        expect(Array.isArray(capturedBody!.tags)).toBe(true)
        expect(Array.isArray(capturedBody!.languageOverrides)).toBe(true)

        // Cleanup to avoid DOM leaks between property iterations
        unmount()
      }),
      { numRuns: 5 },
    )
  })
})


// Feature: frontend-testing, Property 9: Optional fields are omitted or null, not empty strings
describe('ProblemFormPage — Property 9: Optional fields are omitted or null, not empty strings', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  /**
   * Validates: Requirements 8.2
   *
   * For any valid slug and title generated by fast-check, when the creation form
   * is submitted with optional fields (statement, tags) left empty, the request body
   * should either omit those fields entirely or send them as null / empty arrays —
   * never as empty strings.
   */
  it('never sends empty strings for optional fields when they are left blank', async () => {
    const fc = await import('fast-check')

    // Generator: valid slugs (lowercase alphanumeric, 3-12 chars)
    const slugArb = fc.stringMatching(/^[a-z0-9]{3,12}$/)

    // Generator: valid titles (letters + spaces, 1-15 chars, non-blank)
    const titleArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z ]{0,14}$/)

    await fc.assert(
      fc.asyncProperty(slugArb, titleArb, async (slug, title) => {
        let capturedBody: Record<string, unknown> | null = null

        server.use(
          http.post(`${API_URL}/problems`, async ({ request }) => {
            capturedBody = (await request.json()) as Record<string, unknown>
            return HttpResponse.json(
              {
                slug: capturedBody.slug,
                title: capturedBody.title,
                statement: null,
                inputFormat: null,
                outputFormat: null,
                examples: [],
                timeLimit: capturedBody.timeLimit ?? null,
                memoryLimit: capturedBody.memoryLimit ?? null,
                languageOverrides: [],
                tags: [],
                status: 'DRAFT',
                accessibility: 'PRIVATE',
                author: { nickname: 'luisadmin', name: 'Luis Admin' },
                modifiers: [{ nickname: 'luisadmin', name: 'Luis Admin' }],
                files: { testCases: false, solutions: [], checker: false, validator: false },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                problemJudgingUpdatedAt: null,
              },
              { status: 201 },
            )
          }),
        )

        const user = userEvent.setup()
        const { unmount } = renderCreateForm()

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
        })

        // Fill only required fields + numeric limits (needed to pass Zod validation)
        // Leave statement and tags empty — these are the optional fields under test
        await user.type(screen.getByLabelText('Slug'), slug)
        await user.type(screen.getByLabelText('Título'), title)
        await user.type(screen.getByLabelText('Tiempo límite (ms)'), '1000')
        await user.type(screen.getByLabelText('Memoria límite (MiB)'), '128')

        await user.click(screen.getByRole('button', { name: 'Crear' }))

        await waitFor(() => {
          expect(capturedBody).not.toBeNull()
        })

        // statement: must be absent, undefined, or null — never an empty string
        if ('statement' in capturedBody!) {
          expect(capturedBody!.statement).not.toBe('')
        }

        // tags: must be an array (possibly empty) — never an empty string
        if ('tags' in capturedBody!) {
          expect(capturedBody!.tags).not.toBe('')
          expect(Array.isArray(capturedBody!.tags)).toBe(true)
          // No individual tag should be an empty string
          for (const tag of capturedBody!.tags as string[]) {
            expect(tag).not.toBe('')
          }
        }

        // languageOverrides: must be an array — never an empty string
        if ('languageOverrides' in capturedBody!) {
          expect(capturedBody!.languageOverrides).not.toBe('')
          expect(Array.isArray(capturedBody!.languageOverrides)).toBe(true)
        }

        // Cleanup to avoid DOM leaks between property iterations
        unmount()
      }),
      { numRuns: 5 },
    )
  })
})
