import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import fc from 'fast-check'
import { AuthContext, type AuthContextValue } from '@/hooks/useAuth'
import { ContestStandingsPage } from './ContestStandingsPage'
import { server } from '@/test/server'
import type { StandingEntry, StandingProblemResult } from '@/types/contest'

const API_URL = 'http://localhost:8080/api'

/**
 * ContestStandingsPage uses useParams<{ id }> so we need Routes/Route
 * to provide the param. renderWithProviders uses a bare MemoryRouter
 * without Routes, so we set up routing manually.
 */
function renderStandingsPage(contestId: string) {
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
        <MemoryRouter initialEntries={[`/contests/${contestId}`]}>
          <AuthContext.Provider value={auth}>
            <Routes>
              <Route path="/contests/:id" element={<ContestStandingsPage />} />
            </Routes>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
    queryClient,
  }
}

// Helper to build a standings API response with custom standings entries
function buildStandingsResponse(standings: StandingEntry[]) {
  return {
    contest: {
      id: 'contest-2',
      name: 'Práctica Grafos',
      status: 'ACTIVE',
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 14400000).toISOString(),
      penalty: 20,
      freezeMinutes: 60,
      isFrozen: false,
      frozenAt: null,
    },
    problems: [
      { position: 1, slug: 'two-sum', title: 'Two Sum' },
      { position: 2, slug: 'binary-search', title: 'Binary Search' },
      { position: 3, slug: 'graph-bfs', title: 'Graph BFS' },
    ],
    standings,
    pagination: {
      page: 1,
      limit: 50,
      total: standings.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
    filters: {
      country: null,
      city: null,
      institution: null,
      filteredTotal: standings.length,
    },
  }
}

// ============================================================
// Task 9.6: Unit tests — standings rendered in ascending rank order
// Requirements: 9.4
// ============================================================
describe('ContestStandingsPage', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  describe('standings order (Requirement 9.4)', () => {
    it('renders standings rows in ascending order by rank', async () => {
      renderStandingsPage('contest-2')

      // Wait for standings to load — the default mock data has 5 entries ranked 1-5
      await waitFor(() => {
        expect(screen.getByText('Competitive Coders')).toBeInTheDocument()
      })

      // Get all table rows in the tbody
      const tbody = screen.getAllByRole('row').filter((row) => {
        // Filter to body rows (those that contain rank numbers)
        const cells = within(row).queryAllByRole('cell')
        return cells.length > 0
      })

      // Extract rank values from the first cell of each row
      const ranks = tbody.map((row) => {
        const cells = within(row).getAllByRole('cell')
        return parseInt(cells[0].textContent || '0', 10)
      })

      // Verify ascending order
      for (let i = 1; i < ranks.length; i++) {
        expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1])
      }
      expect(ranks).toEqual([1, 2, 3, 4, 5])
    })

    it('renders participant names in the correct rank order', async () => {
      renderStandingsPage('contest-2')

      await waitFor(() => {
        expect(screen.getByText('Competitive Coders')).toBeInTheDocument()
      })

      const tbody = screen.getAllByRole('row').filter((row) => {
        const cells = within(row).queryAllByRole('cell')
        return cells.length > 0
      })

      const names = tbody.map((row) => {
        const cells = within(row).getAllByRole('cell')
        // The participant name is in the second cell
        return cells[1].textContent
      })

      // First entry should be rank 1 (Competitive Coders), last should be rank 5
      expect(names[0]).toContain('Competitive Coders')
      expect(names[4]).toContain('sofiarodriguez')
    })
  })

  // ============================================================
  // Task 9.7: Property test — standings are ordered by rank
  // Feature: frontend-testing, Property 13: Standings are ordered by rank
  // **Validates: Requirements 9.4**
  // ============================================================
  describe('Property 13: Standings are ordered by rank', () => {
    // Arbitrary for a single StandingProblemResult
    const problemResultArb: fc.Arbitrary<StandingProblemResult> = fc.record({
      position: fc.constant(1),
      status: fc.constantFrom('ACCEPTED' as const, 'WRONG_ANSWER' as const, 'NOT_ATTEMPTED' as const),
      attempts: fc.integer({ min: 0, max: 10 }),
      time: fc.option(fc.integer({ min: 1, max: 300 }), { nil: null }),
      penalty: fc.integer({ min: 0, max: 200 }),
    })

    // Arbitrary for a StandingEntry with a given rank
    const standingEntryArb = (rank: number): fc.Arbitrary<StandingEntry> =>
      fc.record({
        rank: fc.constant(rank),
        participant: fc.record({
          id: fc.constant(`participant-${rank}`),
          type: fc.constant('INDIVIDUAL' as const),
          displayName: fc.constant(`user-${rank}`),
          nickname: fc.constant(`user-${rank}`),
        }),
        problemsSolved: fc.integer({ min: 0, max: 3 }),
        totalPenalty: fc.integer({ min: 0, max: 1000 }),
        problems: fc.tuple(
          problemResultArb.map((p) => ({ ...p, position: 1 })),
          problemResultArb.map((p) => ({ ...p, position: 2 })),
          problemResultArb.map((p) => ({ ...p, position: 3 })),
        ),
      })

    // Generate an array of standings with unique ranks in ascending order
    // (as the API provides), with random participant data
    const standingsArb = fc
      .integer({ min: 2, max: 8 })
      .chain((count) => {
        const ranks = Array.from({ length: count }, (_, i) => i + 1)
        return fc.tuple(...ranks.map((r) => standingEntryArb(r)))
      })

    it('renders standings in ascending rank order regardless of input order', async () => {
      await fc.assert(
        fc.asyncProperty(standingsArb, async (standings) => {
          // Override the MSW handler to return our generated standings
          server.use(
            http.get(`${API_URL}/contests/:contestId/standings`, () => {
              return HttpResponse.json(buildStandingsResponse(standings))
            }),
          )

          const { unmount } = renderStandingsPage('contest-2')

          try {
            // Wait for any participant to appear (rank 1 is always present)
            const rank1Name = standings.find((s) => s.rank === 1)!.participant.displayName
            await waitFor(() => {
              expect(screen.getByText(rank1Name)).toBeInTheDocument()
            })

            // Get body rows
            const rows = screen.getAllByRole('row').filter((row) => {
              const cells = within(row).queryAllByRole('cell')
              return cells.length > 0
            })

            // Extract rendered ranks from the first cell
            const renderedRanks = rows.map((row) => {
              const cells = within(row).getAllByRole('cell')
              return parseInt(cells[0].textContent || '0', 10)
            })

            // Verify ascending order
            for (let i = 1; i < renderedRanks.length; i++) {
              if (renderedRanks[i] < renderedRanks[i - 1]) return false
            }
            return renderedRanks.length === standings.length
          } finally {
            unmount()
            server.resetHandlers()
          }
        }),
        { numRuns: 20 },
      )
    }, 60_000)
  })
})
