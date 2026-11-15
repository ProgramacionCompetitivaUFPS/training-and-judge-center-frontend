import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { AcceptInvitationPage } from './AcceptInvitationPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: () => true,
    lastNickname: mockCurrentUser.nickname,
    logout: vi.fn(),
  }),
}))

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

function renderPage(groupId = 'group-1', invitationId = 'inv-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/invitations/${invitationId}`]}>
        <Routes>
          <Route path="/groups/:groupId/invitations/:invitationId" element={<AcceptInvitationPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AcceptInvitationPage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders invitation card with group name', async () => {
    renderPage()
    expect(await screen.findByText('ICPC Colombia')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /aceptar invitación/i })).toBeInTheDocument()
  })

  it('calls accept mutation on button click', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('ICPC Colombia')
    await user.click(screen.getByRole('button', { name: /aceptar invitación/i }))
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' }),
      )
    })
  })
})
