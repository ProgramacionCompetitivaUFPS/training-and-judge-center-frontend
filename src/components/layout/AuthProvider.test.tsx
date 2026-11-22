import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse, delay } from 'msw'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { AuthProvider } from './AuthProvider'
import { useAuth } from '@/hooks/useAuth'
import { server } from '@/mocks/server'
import { mockCurrentUser } from '@/mocks/data'
import { getAccessToken, clearAccessToken, setAccessToken, notifySessionExpired, resetSessionExpiredNotified, markSessionActive, clearSessionMark, hasSessionMark } from '@/lib/tokenStore'
import type { UserRole } from '@/types/user'

// Stable reference so tests can assert on specific calls
const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

// Fresh client and clean token store before each test to prevent cross-test contamination
let queryClient: QueryClient
beforeEach(() => {
  queryClient = createTestQueryClient()
  clearAccessToken()
  clearSessionMark()
  resetSessionExpiredNotified()
  mockToast.mockClear()
  localStorage.clear()
})

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

function AuthConsumer() {
  const { isAuthenticated, isLoading } = useAuth()
  return <div data-testid="state">{isLoading ? 'loading' : isAuthenticated ? 'authenticated' : 'guest'}</div>
}

function HasRoleConsumer({ role }: { role: UserRole | UserRole[] }) {
  const { hasRole } = useAuth()
  return <div data-testid="has-role">{hasRole(role) ? 'yes' : 'no'}</div>
}

describe('AuthProvider', () => {
  it('renders children', () => {
    render(
      <Wrapper>
        <AuthProvider>
          <div>hello</div>
        </AuthProvider>
      </Wrapper>,
    )
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('provides isLoading=true while bootstrap refresh is pending', () => {
    // Never-resolving handler guarantees isLoading=true regardless of handler delays
    markSessionActive()
    server.use(
      http.post('http://localhost:8080/api/auth/refresh', () => delay('infinite')),
    )
    render(
      <Wrapper>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </Wrapper>,
    )
    expect(screen.getByTestId('state').textContent).toBe('loading')
  })

  it('provides isAuthenticated=true after refresh + user load succeeds', async () => {
    markSessionActive()
    render(
      <Wrapper>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </Wrapper>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('state').textContent).toBe('authenticated')
    }, { timeout: 3000 })
  })

  it('provides isAuthenticated=false when refresh returns 401', async () => {
    markSessionActive()
    server.use(
      http.post('http://localhost:8080/api/auth/refresh', () =>
        new HttpResponse(null, { status: 401 }),
      ),
    )
    render(
      <Wrapper>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </Wrapper>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('state').textContent).toBe('guest')
    }, { timeout: 3000 })
  })

  it('shows error toast when session expired event fires', () => {
    setAccessToken('test-token')
    render(
      <Wrapper>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </Wrapper>,
    )
    act(() => {
      notifySessionExpired()
    })
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error', title: 'Sesión expirada' }),
    )
  })

  it('hasRole returns false when not authenticated', async () => {
    markSessionActive()
    server.use(
      http.post('http://localhost:8080/api/auth/refresh', () =>
        new HttpResponse(null, { status: 401 }),
      ),
    )
    render(
      <Wrapper>
        <AuthProvider>
          <HasRoleConsumer role="ADMIN" />
        </AuthProvider>
      </Wrapper>,
    )
    await waitFor(() => expect(screen.getByTestId('has-role').textContent).toBe('no'), { timeout: 3000 })
  })

  it('hasRole returns true for matching role (mockCurrentUser is ADMIN)', async () => {
    markSessionActive()
    render(
      <Wrapper>
        <AuthProvider>
          <HasRoleConsumer role="ADMIN" />
        </AuthProvider>
      </Wrapper>,
    )
    await waitFor(() => expect(screen.getByTestId('has-role').textContent).toBe('yes'), { timeout: 3000 })
  })

  it('hasRole returns false for non-matching role', async () => {
    markSessionActive()
    render(
      <Wrapper>
        <AuthProvider>
          <HasRoleConsumer role="CONTESTANT" />
        </AuthProvider>
      </Wrapper>,
    )
    await waitFor(() => expect(screen.getByTestId('has-role').textContent).toBe('no'), { timeout: 3000 })
  })

  it('hasRole supports array — returns true when user role is in the list', async () => {
    markSessionActive()
    render(
      <Wrapper>
        <AuthProvider>
          <HasRoleConsumer role={['ADMIN', 'COACH']} />
        </AuthProvider>
      </Wrapper>,
    )
    await waitFor(() => expect(screen.getByTestId('has-role').textContent).toBe('yes'), { timeout: 3000 })
  })

  it('hasRole supports array — returns false when user role is not in the list', async () => {
    markSessionActive()
    render(
      <Wrapper>
        <AuthProvider>
          <HasRoleConsumer role={['COACH', 'CONTESTANT']} />
        </AuthProvider>
      </Wrapper>,
    )
    await waitFor(() => expect(screen.getByTestId('has-role').textContent).toBe('no'), { timeout: 3000 })
  })

  it('useAuth throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <Wrapper>
          <AuthConsumer />
        </Wrapper>,
      ),
    ).toThrow('useAuth must be used within an AuthProvider')
    spy.mockRestore()
  })

  it('salta el refresh y termina bootstrapping inmediatamente cuando no hay session mark', async () => {
    // Arrange — no markSessionActive(), flag absent
    let refreshCalled = false
    server.use(
      http.post('http://localhost:8080/api/auth/refresh', () => {
        refreshCalled = true
        return new HttpResponse(null, { status: 401 })
      }),
    )

    // Act
    render(
      <Wrapper>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </Wrapper>,
    )

    // Assert — renders as guest without calling refresh
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('guest'))
    expect(refreshCalled).toBe(false)
  })

  it('llama al refresh cuando hay session mark y lo completa con éxito', async () => {
    // Arrange
    markSessionActive()

    // Act
    render(
      <Wrapper>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </Wrapper>,
    )

    // Assert
    await waitFor(
      () => expect(screen.getByTestId('state').textContent).toBe('authenticated'),
      { timeout: 3000 },
    )
  })

  it('preserva el session mark cuando el refresh falla con error 500 transitorio', async () => {
    // Arrange — transient server error (5xx), mark should be preserved for next load
    markSessionActive()
    server.use(
      http.post('http://localhost:8080/api/auth/refresh', () =>
        new HttpResponse(null, { status: 500 }),
      ),
    )

    // Act
    render(
      <Wrapper>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </Wrapper>,
    )

    // Assert — user is guest (refresh failed) but mark is preserved
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('guest'), { timeout: 5000 })
    expect(hasSessionMark()).toBe(true)
  })

  it('limpia el session mark cuando el refresh devuelve 401', async () => {
    // Arrange
    markSessionActive()
    server.use(
      http.post('http://localhost:8080/api/auth/refresh', () =>
        new HttpResponse(null, { status: 401 }),
      ),
    )

    // Act
    render(
      <Wrapper>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </Wrapper>,
    )

    // Assert
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('guest'))
    expect(hasSessionMark()).toBe(false)
  })

  it('limpia el session mark cuando notifySessionExpired se dispara', () => {
    // Arrange
    markSessionActive()
    setAccessToken('test-token')

    // Act
    render(
      <Wrapper>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </Wrapper>,
    )
    act(() => { notifySessionExpired() })

    // Assert
    expect(hasSessionMark()).toBe(false)
  })
})

describe('AuthProvider — roles', () => {
  const ROLES: UserRole[] = ['ADMIN', 'COACH', 'CONTESTANT']

  it.each(ROLES)('hasRole solo es verdadero para el rol %s del usuario autenticado', async (userRole) => {
    // Arrange
    markSessionActive()
    server.use(
      http.get('http://localhost:8080/api/users/me', () =>
        HttpResponse.json({ ...mockCurrentUser, role: userRole }),
      ),
    )
    function AllRoles() {
      const { hasRole, isLoading } = useAuth()
      if (isLoading) return <div>loading</div>
      return <div data-testid="roles">{ROLES.filter((r) => hasRole(r)).join(',')}</div>
    }

    // Act
    render(
      <Wrapper>
        <AuthProvider>
          <AllRoles />
        </AuthProvider>
      </Wrapper>,
    )

    // Assert
    await waitFor(() => expect(screen.getByTestId('roles').textContent).toBe(userRole), { timeout: 3000 })
  })
})

describe('AuthProvider — cierre de sesión', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('vacía la caché de React Query cuando el token desaparece', async () => {
    // Arrange
    markSessionActive()
    queryClient.setQueryData(['problems', 'detail', 'two-sum'], { slug: 'two-sum' })
    render(
      <Wrapper>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </Wrapper>,
    )
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('authenticated'), { timeout: 3000 })
    expect(queryClient.getQueryData(['problems', 'detail', 'two-sum'])).toEqual({ slug: 'two-sum' })

    // Act
    act(() => { clearAccessToken() })

    // Assert
    expect(queryClient.getQueryData(['problems', 'detail', 'two-sum'])).toBeUndefined()
  })

  it('logout invoca POST /auth/logout, limpia sesión y redirige a /login', async () => {
    // Arrange
    markSessionActive()
    const location = { href: '/dashboard' }
    vi.stubGlobal('location', location)
    let logoutCalls = 0
    server.use(
      http.post('http://localhost:8080/api/auth/logout', () => {
        logoutCalls += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    function LogoutButton() {
      const { logout, isAuthenticated } = useAuth()
      return isAuthenticated ? <button onClick={logout}>Salir</button> : <div>guest</div>
    }
    render(
      <Wrapper>
        <AuthProvider>
          <LogoutButton />
        </AuthProvider>
      </Wrapper>,
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Salir' }, { timeout: 3000 }))

    // Assert
    await waitFor(() => expect(location.href).toBe('/login'))
    expect(logoutCalls).toBe(1)
    expect(getAccessToken()).toBeNull()
    expect(hasSessionMark()).toBe(false)
  })

  it('logout limpia la sesión y redirige aunque el servidor responda 500', async () => {
    // Arrange
    markSessionActive()
    const location = { href: '/dashboard' }
    vi.stubGlobal('location', location)
    server.use(
      http.post('http://localhost:8080/api/auth/logout', () => new HttpResponse(null, { status: 500 })),
    )
    function LogoutButton() {
      const { logout, isAuthenticated } = useAuth()
      return isAuthenticated ? <button onClick={logout}>Salir</button> : <div>guest</div>
    }
    render(
      <Wrapper>
        <AuthProvider>
          <LogoutButton />
        </AuthProvider>
      </Wrapper>,
    )
    const user = userEvent.setup()

    // Act
    await user.click(await screen.findByRole('button', { name: 'Salir' }, { timeout: 3000 }))

    // Assert
    await waitFor(() => expect(location.href).toBe('/login'))
    expect(getAccessToken()).toBeNull()
  })
})
