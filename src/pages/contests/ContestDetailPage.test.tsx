import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockGroupDetails } from '@/mocks/data'
import type { User } from '@/types/user'
import { ContestDetailPage } from './ContestDetailPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

// ContestCountdown uses useSyncExternalStore + setInterval which causes
// "Maximum update depth exceeded" under coverage instrumentation
vi.mock('@/components/features/ContestCountdown', () => ({
  ContestCountdown: () => null,
}))

// Mutable so individual tests can switch to a different role
let _authUser: User = { ...mockCurrentUser }

const mockLogout = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: _authUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: (role: string | string[]) => {
      const roles = Array.isArray(role) ? role : [role]
      return roles.includes(_authUser.role)
    },
    lastNickname: _authUser.nickname,
    logout: mockLogout,
  }),
}))

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

function renderPage(groupId = 'group-1', contestId = 'contest-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/contests/${contestId}`]}>
        <Routes>
          <Route path="/groups/:groupId/contests/:id" element={<ContestDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ContestDetailPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    _authUser = { ...mockCurrentUser }
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders contest name and status badge', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Competencia Semanal #12' })).toBeInTheDocument()
  })

  it('renders not-found page on 404', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
        HttpResponse.json({ error: 'CONTEST_NOT_FOUND' }, { status: 404 }),
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
    })
  })

  it('renders error page on 500', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
        HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    })
  })

  it('ADMIN sees no-participation message instead of Registrarse (SCHEDULED)', async () => {
    // contest-1 is SCHEDULED + MIXED mode; ADMIN is blocked from registering
    renderPage('group-1', 'contest-1')
    await screen.findByRole('heading', { name: 'Competencia Semanal #12' })
    expect(screen.getByText(/Los administradores no participan/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^registrarse$/i })).not.toBeInTheDocument()
  })

  it('CONTESTANT (member) sees Registrarse button for SCHEDULED contest', async () => {
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
    // Override group to return MEMBER role (default mock returns LEAD for luisadmin)
    server.use(
      http.get('http://localhost:8080/api/groups/group-1', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-1'],
          userMembership: { isMember: true, role: 'MEMBER', joinedAt: '2024-09-01T12:00:00Z' },
        }),
      ),
    )
    renderPage('group-1', 'contest-1')
    // For a MEMBER contestant, registrationBlock=null and canRegisterIndividual=true
    expect(await screen.findByRole('button', { name: /^registrarse$/i })).toBeInTheDocument()
  })

  it('group LEAD (non-admin) sees "Editar competencia" for ACTIVE contest', async () => {
    // Use COACH role so the ADMIN shortcut doesn't fire; only the membership LEAD check matters
    _authUser = { ...mockCurrentUser, role: 'COACH', nickname: 'mariacoach' }
    server.use(
      http.get('http://localhost:8080/api/groups/group-1', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-1'],
          userMembership: { isMember: true, role: 'LEAD', joinedAt: '2024-08-01T00:00:00Z' },
        }),
      ),
    )
    renderPage('group-1', 'contest-2')
    await screen.findByRole('heading', { name: 'Práctica Grafos' })
    expect(await screen.findByRole('button', { name: /editar competencia/i })).toBeInTheDocument()
  })

  it('non-LEAD CONTESTANT does not see "Editar competencia" for ACTIVE contest', async () => {
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
    server.use(
      http.get('http://localhost:8080/api/groups/group-1', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-1'],
          userMembership: { isMember: true, role: 'MEMBER', joinedAt: '2024-09-01T12:00:00Z' },
        }),
      ),
    )
    renderPage('group-1', 'contest-2')
    await screen.findByRole('heading', { name: 'Práctica Grafos' })
    expect(screen.queryByRole('button', { name: /editar competencia/i })).not.toBeInTheDocument()
  })

  it('group LEAD (non-admin) does not see "Registrar equipo" button for SCHEDULED MIXED contest', async () => {
    // contest-1 is SCHEDULED + MIXED; COACH with LEAD membership → registrationBlock='lead' → showTeamRegistration=false
    _authUser = { ...mockCurrentUser, role: 'COACH', nickname: 'mariacoach' }
    server.use(
      http.get('http://localhost:8080/api/groups/group-1', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-1'],
          userMembership: { isMember: true, role: 'LEAD', joinedAt: '2024-08-01T00:00:00Z' },
        }),
      ),
    )
    renderPage('group-1', 'contest-1')

    // Wait for the block message to confirm group membership has loaded before asserting the button
    await screen.findByText(/como líder del grupo organizas esta competencia/i)
    expect(screen.queryByRole('button', { name: /registrar equipo/i })).not.toBeInTheDocument()
  })

  it('"Registrar equipo" does not flash before group membership loads for a LEAD', async () => {
    // Verifies that groupMembershipKnown gates showTeamRegistration during the loading window.
    // If the guard were absent, the button would appear briefly while ownerGroup is undefined.
    _authUser = { ...mockCurrentUser, role: 'COACH', nickname: 'mariacoach' }
    let resolveGroup!: (v: Response) => void
    const groupPending = new Promise<Response>((res) => { resolveGroup = res })
    server.use(
      http.get('http://localhost:8080/api/groups/group-1', () => groupPending),
    )
    renderPage('group-1', 'contest-1')

    // Contest is loaded but group is still pending — button must not appear yet
    await screen.findByRole('heading', { name: 'Competencia Semanal #12' })
    expect(screen.queryByRole('button', { name: /registrar equipo/i })).not.toBeInTheDocument()

    // Now resolve the group as LEAD and confirm the button still doesn't appear
    resolveGroup(HttpResponse.json({
      ...mockGroupDetails['group-1'],
      userMembership: { isMember: true, role: 'LEAD', joinedAt: '2024-08-01T00:00:00Z' },
    }))
    await screen.findByText(/como líder del grupo organizas esta competencia/i)
    expect(screen.queryByRole('button', { name: /registrar equipo/i })).not.toBeInTheDocument()
  })

  it('FINISHED contest shows "Finalizado" indicator', async () => {
    // contest-3 is FINISHED; "Finalizado" appears in both the status badge and the timer area
    renderPage('group-1', 'contest-3')
    await screen.findByRole('heading', { name: 'Reto Algoritmos Clásicos' })
    expect(screen.getAllByText(/finalizado/i).length).toBeGreaterThan(0)
  })
})
