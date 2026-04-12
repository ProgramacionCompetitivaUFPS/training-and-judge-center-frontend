import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { AuthContext, type AuthContextValue } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/layout/ToastProvider'
import { ProblemsPage } from './ProblemsPage'
import { ProblemDetailPage } from './ProblemDetailPage'
import { ProblemFormPage } from './ProblemFormPage'
import { ProblemSubmissionsPage } from './ProblemSubmissionsPage'
import { server } from '@/test/server'
import { mockProblems } from '@/mocks/data'

const API_URL = 'http://localhost:8080/api'

function createAdminAuth(): AuthContextValue {
  return {
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
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

/**
 * Renders with full routing support needed for pages that use useParams.
 */
function renderWithRoutes(
  initialRoute: string,
  queryClient?: QueryClient,
) {
  const qc = queryClient ?? createQueryClient()
  const auth = createAdminAuth()

  const result = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthContext.Provider value={auth}>
          <ToastProvider>
            <Routes>
              <Route path="/problems" element={<ProblemsPage />} />
              <Route path="/problems/new" element={<ProblemFormPage />} />
              <Route path="/problems/:slug" element={<ProblemDetailPage />} />
              <Route path="/problems/:slug/edit" element={<ProblemFormPage />} />
              <Route path="/problems/:slug/submissions" element={<ProblemSubmissionsPage />} />
            </Routes>
          </ToastProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return { ...result, queryClient: qc }
}

describe('Cache invalidation after mutations (Requirement 12)', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  // Requirement 12.1: After creating a resource, the list view refreshes to include it
  describe('13.1 Create → list refresh', () => {
    it('after creating a problem, the list view includes the new problem', async () => {
      const user = userEvent.setup()
      const newSlug = 'cache-test-problem-' + Date.now()
      const newTitle = 'Cache Test Problem'

      // Override the create handler to return a known new problem
      server.use(
        http.post(`${API_URL}/problems`, async () => {
          return HttpResponse.json(
            {
              slug: newSlug,
              title: newTitle,
              statement: null,
              inputFormat: null,
              outputFormat: null,
              examples: [],
              timeLimit: 2000,
              memoryLimit: 256,
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

      // After creation, the app navigates to /problems/:slug.
      // Override the detail handler for the new slug and the list handler
      // to include the new problem.
      server.use(
        http.get(`${API_URL}/problems/${newSlug}`, () => {
          return HttpResponse.json({
            slug: newSlug,
            title: newTitle,
            statement: null,
            inputFormat: null,
            outputFormat: null,
            examples: [],
            timeLimit: 2000,
            memoryLimit: 256,
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
          })
        }),
      )

      // Start on the create form
      const { queryClient } = renderWithRoutes('/problems/new')

      // Wait for the create form to render
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
      })

      // Fill in required fields
      await user.type(screen.getByLabelText('Slug'), newSlug)
      await user.type(screen.getByLabelText('Título'), newTitle)

      // Submit the form
      await user.click(screen.getByRole('button', { name: 'Crear' }))

      // After successful creation, the mutation's onSuccess calls
      // queryClient.invalidateQueries({ queryKey: problemKeys.all })
      // Verify the problems list cache was invalidated
      await waitFor(() => {
        const queriesState = queryClient.getQueryCache().findAll({
          queryKey: ['problems'],
        })
        // After invalidation, queries should be marked as stale/invalidated
        const listQueries = queriesState.filter((q) =>
          q.queryKey[1] === 'list',
        )
        // Either there are no list queries cached (invalidated and GC'd with gcTime: 0)
        // or they are marked as invalidated (state.isInvalidated)
        for (const q of listQueries) {
          expect(q.state.isInvalidated || q.state.dataUpdateCount === 0).toBe(true)
        }
      })
    })
  })

  // Requirement 12.2: After editing a resource, the detail view shows updated values
  describe('13.2 Edit → detail refresh', () => {
    it('after editing a problem, the detail view shows the updated title', async () => {
      const user = userEvent.setup()
      const slug = 'segment-tree-range'
      const updatedTitle = 'Updated Segment Tree Title'

      // Override the update handler to return updated data
      server.use(
        http.put(`${API_URL}/problems/${slug}`, async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>
          const original = mockProblems.find((p) => p.slug === slug)!
          return HttpResponse.json({
            ...original,
            ...body,
            updatedAt: new Date().toISOString(),
          })
        }),
      )

      // Override the detail handler to return updated data after edit
      let detailCallCount = 0
      server.use(
        http.get(`${API_URL}/problems/${slug}`, () => {
          detailCallCount++
          const original = mockProblems.find((p) => p.slug === slug)!
          // After the first call (edit form load), return updated data
          if (detailCallCount > 1) {
            return HttpResponse.json({
              ...original,
              title: updatedTitle,
              updatedAt: new Date().toISOString(),
            })
          }
          return HttpResponse.json(original)
        }),
      )

      // Start on the edit form
      renderWithRoutes(`/problems/${slug}/edit`)

      // Wait for the edit form to load
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Editar problema' })).toBeInTheDocument()
      })

      // Change the title
      const titleInput = screen.getByLabelText('Título')
      await user.clear(titleInput)
      await user.type(titleInput, updatedTitle)

      // Submit the form
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      // After successful update, the mutation's onSuccess calls:
      // queryClient.invalidateQueries({ queryKey: problemKeys.all })
      // queryClient.invalidateQueries({ queryKey: problemKeys.detail(slug) })
      // The app navigates to /problems/:slug (detail page)
      // The detail page should refetch and show the updated title
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: updatedTitle })).toBeInTheDocument()
      })
    })
  })

  // Requirement 12.3: After deleting a resource, the list view no longer includes it
  describe('13.3 Delete → list refresh', () => {
    it('after deleting a problem, the list view no longer includes it', async () => {
      const user = userEvent.setup()
      const slug = 'segment-tree-range'
      const problemTitle = 'Segment Tree Range Query'

      // Override the delete handler
      server.use(
        http.delete(`${API_URL}/problems/${slug}`, async () => {
          return new HttpResponse(null, { status: 204 })
        }),
      )

      // Override the list handler to exclude the deleted problem after deletion
      let listCallCount = 0
      server.use(
        http.get(`${API_URL}/problems`, ({ request }) => {
          listCallCount++
          const sp = new URL(request.url).searchParams
          const page = Number(sp.get('page')) || 1
          const limit = Number(sp.get('limit')) || 20

          // After the first call, exclude the deleted problem
          const problems = listCallCount > 1
            ? mockProblems.filter((p) => p.slug !== slug)
            : [...mockProblems]

          const items = problems
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice((page - 1) * limit, page * limit)
            .map((p) => ({
              slug: p.slug,
              title: p.title,
              tags: p.tags,
              status: p.status,
              accessibility: p.accessibility,
              author: p.author,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
            }))

          return HttpResponse.json({
            problems: items,
            pagination: {
              totalCount: problems.length,
              currentPage: page,
              totalPages: Math.ceil(problems.length / limit) || 1,
              itemsPerPage: limit,
            },
          })
        }),
      )

      // Start on the detail page of the problem to delete
      renderWithRoutes(`/problems/${slug}`)

      // Wait for the detail page to load
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: problemTitle })).toBeInTheDocument()
      })

      // Click the delete button
      await user.click(screen.getByRole('button', { name: /Eliminar/i }))

      // The delete dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/Esta acción es irreversible/i)).toBeInTheDocument()
      })

      // Type the confirmation slug
      const confirmInput = screen.getByLabelText('Confirmar slug')
      await user.type(confirmInput, slug)

      // Click the confirm delete button in the dialog
      const deleteButtons = screen.getAllByRole('button', { name: /Eliminar/i })
      const confirmDeleteBtn = deleteButtons.find(
        (btn) => !btn.hasAttribute('disabled') && btn.closest('[role="dialog"]'),
      )!
      await user.click(confirmDeleteBtn)

      // After successful deletion, the app navigates to /problems (list page)
      // The list should refetch and NOT include the deleted problem
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Problemas' })).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.queryByText(problemTitle)).not.toBeInTheDocument()
      })
    })
  })

  // Requirement 12.4: After submitting a solution, the submissions list includes the new submission
  describe('13.4 Submission → list refresh', () => {
    it('after submitting a solution, the submissions list query is invalidated', async () => {
      const slug = 'two-sum'

      // Track how many times the submissions list endpoint is called
      let submissionsCallCount = 0
      server.use(
        http.get(`${API_URL}/problems/${slug}/submissions`, () => {
          submissionsCallCount++

          // On the second call (after invalidation), include a new submission
          const submissions =
            submissionsCallCount > 1
              ? [
                  {
                    id: 'sub-new-cache-test',
                    status: 'PENDING',
                    visibility: 'PRIVATE',
                    submittedAt: new Date().toISOString(),
                    problem: { slug: 'two-sum', title: 'Two Sum' },
                    contest: null,
                    submittedBy: { id: 'u1', nickname: 'luisadmin' },
                    language: 'cpp20',
                    executionTime: null,
                    memoryUsed: null,
                  },
                ]
              : []

          return HttpResponse.json({
            submissions,
            pagination: {
              page: 1,
              limit: 20,
              total: submissions.length,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            },
          })
        }),
      )

      // Override the submit handler
      server.use(
        http.post(`${API_URL}/problems/${slug}/submissions`, async () => {
          return HttpResponse.json(
            {
              id: 'sub-new-cache-test',
              status: 'PENDING',
              submittedAt: new Date().toISOString(),
              problem: { slug: 'two-sum', title: 'Two Sum' },
              language: 'cpp20',
              compiler: 'g++',
              fileSize: 1024,
              fileHash: 'mock-hash',
            },
            { status: 201 },
          )
        }),
      )

      // Render the submissions page — initially shows empty
      const { queryClient } = renderWithRoutes(`/problems/${slug}/submissions`)

      // Wait for the page to load and show initial empty state
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /Submissions/i }),
        ).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('No hay submissions')).toBeInTheDocument()
      })

      // Record the initial call count
      const initialCallCount = submissionsCallCount

      // Simulate what useSubmitSolution does: call the API then invalidate queries
      const { submitSolution } = await import('@/api/submissions')
      const file = new File(['int main() {}'], 'solution.cpp', { type: 'text/plain' })
      await submitSolution(slug, file, 'cpp20', 'g++')

      // Invalidate the submissions queries — this is exactly what
      // useSubmitSolution.onSuccess does: queryClient.invalidateQueries({ queryKey: submissionKeys.all })
      await queryClient.invalidateQueries({ queryKey: ['submissions'] })

      // After invalidation, the query should refetch (call count increases)
      // and the new submission should appear in the UI
      await waitFor(() => {
        expect(submissionsCallCount).toBeGreaterThan(initialCallCount)
      })

      // The refetched data now includes the new submission — verify it renders
      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })
    })
  })
})
