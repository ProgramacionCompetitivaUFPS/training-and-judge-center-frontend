import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { AuthProvider } from './AuthProvider'
import { useAuth } from '@/hooks/useAuth'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { server } from '@/mocks/server'

vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: vi.fn() }),
}))

// QueryClient created outside Wrapper so it isn't re-created on re-renders
const queryClient = createTestQueryClient()

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
