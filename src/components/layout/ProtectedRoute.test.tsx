import { describe, it, expect } from 'vitest'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders, screen } from '@/test/test-utils'
import { ProtectedRoute } from './ProtectedRoute'

/**
 * Minimal route setup that mirrors the admin route protection from App.tsx.
 * The Dashboard and Login routes act as redirect targets so we can assert navigation.
 */
function TestRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<p>Login Page</p>} />
      <Route path="/dashboard" element={<p>Dashboard Page</p>} />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <p>Admin Users Page</p>
          </ProtectedRoute>
        }
      />
      <Route
        path="/problems/new"
        element={
          <ProtectedRoute roles={['ADMIN', 'COACH']}>
            <p>New Problem Page</p>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

describe('ProtectedRoute', () => {
  describe('redirect behavior', () => {
    it('redirects CONTESTANT away from admin-only route (/admin/users)', () => {
      renderWithProviders(<TestRoutes />, {
        role: 'CONTESTANT',
        initialRoute: '/admin/users',
      })

      expect(screen.queryByText('Admin Users Page')).not.toBeInTheDocument()
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    })

    it('redirects COACH away from admin-only route (/admin/users)', () => {
      renderWithProviders(<TestRoutes />, {
        role: 'COACH',
        initialRoute: '/admin/users',
      })

      expect(screen.queryByText('Admin Users Page')).not.toBeInTheDocument()
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    })

    it('redirects CONTESTANT away from ADMIN/COACH route (/problems/new)', () => {
      renderWithProviders(<TestRoutes />, {
        role: 'CONTESTANT',
        initialRoute: '/problems/new',
      })

      expect(screen.queryByText('New Problem Page')).not.toBeInTheDocument()
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    })

    it('redirects unauthenticated user to login', () => {
      renderWithProviders(<TestRoutes />, {
        initialRoute: '/admin/users',
        authValue: { isAuthenticated: false, user: undefined },
      })

      expect(screen.queryByText('Admin Users Page')).not.toBeInTheDocument()
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })

  describe('access granted', () => {
    it('allows ADMIN to access admin-only route (/admin/users)', () => {
      renderWithProviders(<TestRoutes />, {
        role: 'ADMIN',
        initialRoute: '/admin/users',
      })

      expect(screen.getByText('Admin Users Page')).toBeInTheDocument()
    })

    it('allows ADMIN to access ADMIN/COACH route (/problems/new)', () => {
      renderWithProviders(<TestRoutes />, {
        role: 'ADMIN',
        initialRoute: '/problems/new',
      })

      expect(screen.getByText('New Problem Page')).toBeInTheDocument()
    })

    it('allows COACH to access ADMIN/COACH route (/problems/new)', () => {
      renderWithProviders(<TestRoutes />, {
        role: 'COACH',
        initialRoute: '/problems/new',
      })

      expect(screen.getByText('New Problem Page')).toBeInTheDocument()
    })
  })
})
