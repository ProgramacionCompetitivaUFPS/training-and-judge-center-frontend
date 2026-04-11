import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '@/hooks/useAuth'
import type { User, UserRole } from '@/types/user'

export function createMockUser(role: UserRole): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    nickname: 'testuser',
    country: 'CO',
    city: 'Bogotá',
    institution: 'Test University',
    role,
    status: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00Z',
  }
}

export function createAuthValue(role: UserRole): AuthContextValue {
  const user = createMockUser(role)
  return {
    user,
    isLoading: false,
    isAuthenticated: true,
    hasRole: (r: UserRole | UserRole[]) => {
      const roles = Array.isArray(r) ? r : [r]
      return roles.includes(role)
    },
    logout: () => {},
  }
}

interface ProviderOptions {
  role?: UserRole
  initialRoute?: string
  authValue?: Partial<AuthContextValue>
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const { role = 'CONTESTANT', initialRoute = '/', authValue, ...renderOptions } = options

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  const auth: AuthContextValue = {
    ...createAuthValue(role),
    ...authValue,
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <AuthContext.Provider value={auth}>
            {children}
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient }
}

export { server } from './server'
export { userEvent } from '@testing-library/user-event'
export * from '@testing-library/react'
