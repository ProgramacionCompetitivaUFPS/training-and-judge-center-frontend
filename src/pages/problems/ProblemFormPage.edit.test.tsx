import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { AuthContext, type AuthContextValue } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/layout/ToastProvider'
import { ProblemFormPage } from './ProblemFormPage'
import { server } from '@/test/server'
import { mockProblems } from '@/mocks/data'

const API_URL = 'http://localhost:8080/api'

/**
 * The edit route requires useParams to extract :slug from the URL.
 * renderWithProviders uses a bare MemoryRouter without Routes/Route,
 * so useParams won't work. We set up routing manually here.
 */
function renderEditForm(slug: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  const auth: AuthContextValue = {
    user: {
      id: 'test-user-id',
      email: 'admin@trainingcenter.com',
      name: 'Luis Admin',
      nickname: 'luisadmin',
      country: 'Colombia',
      city: 'Bogotá',
      institution: 'Universidad Nacional',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: '2024-01-01T00:00:00Z',
    },
    isLoading: false,
    isAuthenticated: true,
    hasRole: (r) => {
      const roles = Array.isArray(r) ? r : [r]
      return roles.includes('ADMIN')
    },
    logout: () => {},
  }

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/problems/${slug}/edit`]}>
          <AuthContext.Provider value={auth}>
            <ToastProvider>
              <Routes>
                <Route path="/problems/:slug/edit" element={<ProblemFormPage />} />
              </Routes>
            </ToastProvider>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
    queryClient,
  }
}

// Use 'segment-tree-range' — a DRAFT problem authored by luisadmin
const draftProblem = mockProblems.find((p) => p.slug === 'segment-tree-range')!

describe('ProblemFormPage — edit form pre-population (Requirements 8.3, 8.4)', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  // Requirement 8.3: edit form pre-populates all fields with current values
  describe('pre-population with existing data', () => {
    it('pre-populates title with the current problem title', async () => {
      renderEditForm('segment-tree-range')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Editar problema' })).toBeInTheDocument()
      })

      const titleInput = screen.getByLabelText('Título') as HTMLInputElement
      expect(titleInput.value).toBe(draftProblem.title)
    })

    it('pre-populates time limit with the current value', async () => {
      renderEditForm('segment-tree-range')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Editar problema' })).toBeInTheDocument()
      })

      const timeLimitInput = screen.getByLabelText('Tiempo límite (ms)') as HTMLInputElement
      expect(timeLimitInput.value).toBe(String(draftProblem.timeLimit))
    })

    it('pre-populates memory limit with the current value', async () => {
      renderEditForm('segment-tree-range')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Editar problema' })).toBeInTheDocument()
      })

      const memoryLimitInput = screen.getByLabelText('Memoria límite (MiB)') as HTMLInputElement
      expect(memoryLimitInput.value).toBe(String(draftProblem.memoryLimit))
    })

    it('displays the slug as read-only text (not editable)', async () => {
      renderEditForm('segment-tree-range')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Editar problema' })).toBeInTheDocument()
      })

      // The slug is displayed as static text, not an input
      expect(screen.getByText('segment-tree-range')).toBeInTheDocument()
      expect(screen.getByText('El slug no se puede cambiar')).toBeInTheDocument()
    })

    it('pre-populates tags as badge chips', async () => {
      renderEditForm('segment-tree-range')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Editar problema' })).toBeInTheDocument()
      })

      // Tags should be rendered as badge chips
      for (const tag of draftProblem.tags) {
        expect(screen.getByText(tag)).toBeInTheDocument()
      }
    })
  })

  // Requirement 8.4: modified fields are sent correctly on submit
  describe('modified fields sent on submit', () => {
    it('sends updated title in the request body when title is changed', async () => {
      let capturedBody: Record<string, unknown> | null = null

      server.use(
        http.put(`${API_URL}/problems/segment-tree-range`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({
            ...draftProblem,
            ...capturedBody,
            updatedAt: new Date().toISOString(),
          })
        }),
      )

      const user = userEvent.setup()
      renderEditForm('segment-tree-range')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Editar problema' })).toBeInTheDocument()
      })

      // Clear and type a new title
      const titleInput = screen.getByLabelText('Título')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Segment Tree')

      // Submit the form
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      await waitFor(() => {
        expect(capturedBody).not.toBeNull()
      })

      expect(capturedBody!.title).toBe('Updated Segment Tree')
    })

    it('sends updated time limit when changed', async () => {
      let capturedBody: Record<string, unknown> | null = null

      server.use(
        http.put(`${API_URL}/problems/segment-tree-range`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({
            ...draftProblem,
            ...capturedBody,
            updatedAt: new Date().toISOString(),
          })
        }),
      )

      const user = userEvent.setup()
      renderEditForm('segment-tree-range')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Editar problema' })).toBeInTheDocument()
      })

      const timeLimitInput = screen.getByLabelText('Tiempo límite (ms)')
      await user.clear(timeLimitInput)
      await user.type(timeLimitInput, '5000')

      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      await waitFor(() => {
        expect(capturedBody).not.toBeNull()
      })

      expect(capturedBody!.timeLimit).toBe(5000)
    })
  })
})

// Feature: frontend-testing, Property 10: Edit form pre-populates with existing data
describe('Property 10: Edit form pre-populates with existing data', () => {
  /**
   * Validates: Requirements 8.3
   *
   * For any DRAFT problem editable by the ADMIN user, when the edit form loads,
   * all fields (title, timeLimit, memoryLimit, tags) should be pre-populated
   * with the current values from the API response.
   */

  // Only DRAFT problems can be edited (PUBLISHED ones show a "cannot edit" message)
  const editableProblems = mockProblems.filter((p) => p.status === 'DRAFT')

  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  it('pre-populates all fields with existing data for any editable problem', async () => {
    const fc = await import('fast-check')

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...editableProblems),
        async (problem) => {
          const { unmount } = renderEditForm(problem.slug)

          // Wait for the edit form to load
          await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Editar problema' })).toBeInTheDocument()
          })

          // Verify title is pre-populated
          const titleInput = screen.getByLabelText('Título') as HTMLInputElement
          expect(titleInput.value).toBe(problem.title)

          // Verify timeLimit is pre-populated (or empty for null)
          const timeLimitInput = screen.getByLabelText('Tiempo límite (ms)') as HTMLInputElement
          if (problem.timeLimit != null) {
            expect(timeLimitInput.value).toBe(String(problem.timeLimit))
          } else {
            expect(timeLimitInput.value).toBe('')
          }

          // Verify memoryLimit is pre-populated (or empty for null)
          const memoryLimitInput = screen.getByLabelText('Memoria límite (MiB)') as HTMLInputElement
          if (problem.memoryLimit != null) {
            expect(memoryLimitInput.value).toBe(String(problem.memoryLimit))
          } else {
            expect(memoryLimitInput.value).toBe('')
          }

          // Verify tags are rendered as badge chips
          for (const tag of problem.tags) {
            expect(screen.getByText(tag)).toBeInTheDocument()
          }

          // Cleanup to avoid DOM leaks between property runs
          unmount()
        },
      ),
      { numRuns: editableProblems.length },
    )
  })
})
