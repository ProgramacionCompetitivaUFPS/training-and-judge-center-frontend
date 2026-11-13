import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse, delay } from 'msw'
import { AuthProvider } from './AuthProvider'
import { useAuth } from '@/hooks/useAuth'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken, notifySessionExpired, resetSessionExpiredNotified } from '@/lib/tokenStore'

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
  resetSessionExpiredNotified()
  mockToast.mockClear()
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

function HasRoleConsumer({ role }: { role: string | string[] }) {
  const { hasRole } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <div data-testid="has-role">{hasRole(role as any) ? 'yes' : 'no'}</div>
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
})
