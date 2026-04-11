import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/test-utils'
import { useAuth } from '@/hooks/useAuth'

/** Tiny component that reads from all providers wired by renderWithProviders */
function ProbeComponent() {
  const { user, isAuthenticated } = useAuth()
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'anonymous'}</span>
      {user && <span data-testid="user-role">{user.role}</span>}
    </div>
  )
}

describe('Test infrastructure smoke test', () => {
  it('renders a component with all providers without crashing', () => {
    const { container } = renderWithProviders(<ProbeComponent />)
    expect(container).toBeTruthy()
  })

  it('provides auth context with the requested role', () => {
    renderWithProviders(<ProbeComponent />, { role: 'ADMIN' })
    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user-role')).toHaveTextContent('ADMIN')
  })

  it('defaults to CONTESTANT role', () => {
    renderWithProviders(<ProbeComponent />)
    expect(screen.getByTestId('user-role')).toHaveTextContent('CONTESTANT')
  })
})
