import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { mockCurrentUser } from '@/mocks/data'
import { NotFoundPage } from './NotFoundPage'

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

beforeEach(() => {
  mockLogout.mockClear()
})

function renderPage() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NotFoundPage', () => {
  it('renders 404 heading and navigation buttons', () => {
    renderPage()
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ir al inicio/i })).toBeInTheDocument()
  })
})
