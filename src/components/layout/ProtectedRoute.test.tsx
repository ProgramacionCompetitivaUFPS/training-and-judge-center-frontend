import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { ROUTES } from '@/lib/constants'

vi.mock('@/hooks/useAuth')
vi.mock('@/pages/errors/NotFoundPage', () => ({
  NotFoundPage: () => <div>Not Found</div>,
}))

import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

function renderProtected(children = <div>Protected Content</div>, roles?: string[]) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/protected" element={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <ProtectedRoute roles={roles as any}>{children}</ProtectedRoute>
        } />
        <Route path={ROUTES.LOGIN} element={<div>Login Page</div>} />
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
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
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
    const { container } = renderProtected()
    // Skeleton renders divs, not the login page or protected content
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders children when authenticated with no role restriction', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', nickname: 'test', role: 'CONTESTANT' } as never,
      isLoading: false,
      isAuthenticated: true,
      hasRole: () => true,
      logout: vi.fn(),
      lastNickname: 'test',
    })
    renderProtected()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders NotFoundPage when authenticated but role does not match', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', nickname: 'test', role: 'CONTESTANT' } as never,
      isLoading: false,
      isAuthenticated: true,
      hasRole: () => false,
      logout: vi.fn(),
      lastNickname: 'test',
    })
    renderProtected(<div>Protected Content</div>, ['ADMIN'])
    expect(screen.getByText('Not Found')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when authenticated with correct role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', nickname: 'test', role: 'ADMIN' } as never,
      isLoading: false,
      isAuthenticated: true,
      hasRole: () => true,
      logout: vi.fn(),
      lastNickname: 'test',
    })
    renderProtected(<div>Protected Content</div>, ['ADMIN'])
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
