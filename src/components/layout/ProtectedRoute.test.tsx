import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { ROUTES } from '@/lib/constants'
import { mockCurrentUser } from '@/mocks/data'
import type { UserRole } from '@/types/user'

vi.mock('@/hooks/useAuth')
vi.mock('@/pages/errors/NotFoundPage', () => ({
  NotFoundPage: () => <div>Not Found</div>,
}))

import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

// Renders location.state so tests can assert on it
function LoginSpy() {
  const location = useLocation()
  return <div data-testid="login-state">{JSON.stringify(location.state)}</div>
}

function renderProtected(children = <div>Protected Content</div>, roles?: UserRole[]) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={<ProtectedRoute roles={roles}>{children}</ProtectedRoute>}
        />
        <Route path={ROUTES.LOGIN} element={<LoginSpy />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
      isAuthenticated: false,
      hasRole: () => false,
      logout: vi.fn(),
      lastNickname: null,
    })
  })

  it('redirects to login when not authenticated', () => {
    renderProtected()
    expect(screen.getByTestId('login-state')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('passes location state with from and fromNickname when redirecting', () => {
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
      isAuthenticated: false,
      hasRole: () => false,
      logout: vi.fn(),
      lastNickname: 'luisadmin',
    })
    renderProtected()
    const state = JSON.parse(screen.getByTestId('login-state').textContent!)
    expect(state.from.pathname).toBe('/protected')
    expect(state.fromNickname).toBe('luisadmin')
  })

  it('shows skeleton while loading', () => {
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: true,
      isAuthenticated: false,
      hasRole: () => false,
      logout: vi.fn(),
      lastNickname: null,
    })
    renderProtected()
    expect(screen.queryByTestId('login-state')).not.toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.getAllByRole('status')).not.toHaveLength(0)
  })

  it('renders children when authenticated with no role restriction', () => {
    mockUseAuth.mockReturnValue({
      user: mockCurrentUser,
      isLoading: false,
      isAuthenticated: true,
      hasRole: () => true,
      logout: vi.fn(),
      lastNickname: mockCurrentUser.nickname,
    })
    renderProtected()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders NotFoundPage when authenticated but role does not match', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockCurrentUser, role: 'CONTESTANT' },
      isLoading: false,
      isAuthenticated: true,
      hasRole: () => false,
      logout: vi.fn(),
      lastNickname: mockCurrentUser.nickname,
    })
    renderProtected(<div>Protected Content</div>, ['ADMIN'])
    expect(screen.getByText('Not Found')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when authenticated with correct role', () => {
    mockUseAuth.mockReturnValue({
      user: mockCurrentUser,
      isLoading: false,
      isAuthenticated: true,
      hasRole: () => true,
      logout: vi.fn(),
      lastNickname: mockCurrentUser.nickname,
    })
    renderProtected(<div>Protected Content</div>, ['ADMIN'])
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
