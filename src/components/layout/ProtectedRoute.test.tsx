import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders, screen } from '@/test/test-utils'
import { ProtectedRoute } from './ProtectedRoute'
import type { UserRole } from '@/types/user'

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

// Feature: frontend-testing, Property 3: Role-restricted route redirect
describe('ProtectedRoute — Property 3: Role-restricted route redirect', () => {
  /**
   * Validates: Requirements 4.6
   *
   * Define all role-restricted routes from App.tsx with their allowed roles.
   * For each combination of route × role, verify:
   *   - Unauthorized roles are redirected to dashboard
   *   - Authorized roles can access the protected content
   */

  const ALL_ROLES: UserRole[] = ['ADMIN', 'COACH', 'CONTESTANT']

  interface ProtectedRouteConfig {
    path: string
    allowedRoles: UserRole[]
    label: string
  }

  const ROLE_RESTRICTED_ROUTES: ProtectedRouteConfig[] = [
    { path: '/admin/users', allowedRoles: ['ADMIN'], label: 'Admin Users Page' },
    { path: '/problems/new', allowedRoles: ['ADMIN', 'COACH'], label: 'New Problem Page' },
    { path: '/problems/test-slug/edit', allowedRoles: ['ADMIN', 'COACH'], label: 'Edit Problem Page' },
    { path: '/groups/new', allowedRoles: ['ADMIN', 'COACH'], label: 'New Group Page' },
    { path: '/groups/1/edit', allowedRoles: ['ADMIN', 'COACH'], label: 'Edit Group Page' },
    { path: '/groups/1/contests/new', allowedRoles: ['ADMIN', 'COACH'], label: 'New Contest Page' },
    { path: '/groups/1/contests/2/edit', allowedRoles: ['ADMIN', 'COACH'], label: 'Edit Contest Page' },
    { path: '/groups/1/materials/new', allowedRoles: ['ADMIN', 'COACH'], label: 'New Material Page' },
    { path: '/groups/1/materials/2/edit', allowedRoles: ['ADMIN', 'COACH'], label: 'Edit Material Page' },
  ]

  /** Build a Routes tree with all role-restricted routes plus redirect targets */
  function PropertyTestRoutes() {
    return (
      <Routes>
        <Route path="/login" element={<p>Login Page</p>} />
        <Route path="/dashboard" element={<p>Dashboard Page</p>} />
        {ROLE_RESTRICTED_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRoute roles={route.allowedRoles}>
                <p>{route.label}</p>
              </ProtectedRoute>
            }
          />
        ))}
      </Routes>
    )
  }

  const routeArb = fc.constantFrom(...ROLE_RESTRICTED_ROUTES)
  const roleArb = fc.constantFrom<UserRole>(...ALL_ROLES)

  it('unauthorized roles are redirected to dashboard for any role-restricted route', () => {
    fc.assert(
      fc.property(routeArb, roleArb, (route, role) => {
        const isAuthorized = route.allowedRoles.includes(role)

        // Only test unauthorized combinations
        if (isAuthorized) return true

        const { unmount } = renderWithProviders(<PropertyTestRoutes />, {
          role,
          initialRoute: route.path,
        })

        const protectedContent = screen.queryByText(route.label)
        const dashboardContent = screen.queryByText('Dashboard Page')

        unmount()

        // Unauthorized role must NOT see the protected content
        // and MUST be redirected to dashboard
        return protectedContent === null && dashboardContent !== null
      }),
      { numRuns: 100 },
    )
  })

  it('authorized roles can access any role-restricted route', () => {
    fc.assert(
      fc.property(routeArb, roleArb, (route, role) => {
        const isAuthorized = route.allowedRoles.includes(role)

        // Only test authorized combinations
        if (!isAuthorized) return true

        const { unmount } = renderWithProviders(<PropertyTestRoutes />, {
          role,
          initialRoute: route.path,
        })

        const protectedContent = screen.queryByText(route.label)

        unmount()

        // Authorized role MUST see the protected content
        return protectedContent !== null
      }),
      { numRuns: 100 },
    )
  })
})
