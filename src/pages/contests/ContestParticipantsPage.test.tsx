import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { ContestParticipantsPage } from './ContestParticipantsPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

const mockLogout = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: () => true,
    lastNickname: mockCurrentUser.nickname,
    logout: mockLogout,
  }),
}))

function renderPage(groupId = 'group-1', contestId = 'contest-2') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/contests/${contestId}/participants`]}>
        <Routes>
          <Route path="/groups/:groupId/contests/:id/participants" element={<ContestParticipantsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ContestParticipantsPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
  })
  afterEach(() => clearAccessToken())

  it('renders participant list', async () => {
    renderPage()
    expect(await screen.findByRole('link', { name: '@luisadmin' })).toBeInTheDocument()
  })

  it('shows search input', async () => {
    renderPage()
    await screen.findByRole('link', { name: '@luisadmin' })
    expect(screen.getByRole('textbox', { name: /buscar participantes/i })).toBeInTheDocument()
  })
})
