import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { GroupDetailPage } from './GroupDetailPage'

vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: vi.fn() }),
}))

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: (roles: string[]) => roles.includes(mockCurrentUser.role),
    logout: vi.fn(),
  }),
}))

function renderPage(groupId = 'group-1') {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/groups/${groupId}`]}>
        <Routes>
          <Route path="/groups/:id" element={<GroupDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GroupDetailPage', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it('renders group name and navigation tabs', async () => {
    // Arrange
    renderPage('group-1')

    // Assert — mockGroupDetails['group-1'].name = 'ICPC Colombia'
    await waitFor(() => {
      expect(screen.getAllByText('ICPC Colombia').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByRole('tab', { name: /miembros/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /materiales/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /competencias/i })).toBeInTheDocument()
    })
  })

  it('shows member list in members tab', async () => {
    // Arrange
    renderPage('group-1')

    // Assert — mockGroupMembers['group-1'][0].nickname = 'luisadmin'
    await waitFor(() => {
      expect(screen.getByText('luisadmin')).toBeInTheDocument()
    })
  })

  it('shows "Solicitudes" tab for group LEAD / platform ADMIN', async () => {
    // Arrange — mockCurrentUser is ADMIN and group-1 userMembership.role = 'LEAD' → canManage = true
    renderPage('group-1')

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /solicitudes/i })).toBeInTheDocument()
    })
  })
})
