import { describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { ProblemsPage } from './ProblemsPage'
import type { UserRole } from '@/types/user'

describe('ProblemsPage', () => {
  describe('role-based visibility', () => {
    describe('CONTESTANT role', () => {
      beforeEach(() => {
        localStorage.removeItem('auth_token')
      })

      it('does not render the "Crear problema" button', async () => {
        renderWithProviders(<ProblemsPage />, { role: 'CONTESTANT' })

        // Wait for the page heading to render
        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'Problemas' })).toBeInTheDocument()
        })

        expect(screen.queryByText('Crear problema')).not.toBeInTheDocument()
      })

      it('does not render status or accessibility filter selects', async () => {
        renderWithProviders(<ProblemsPage />, { role: 'CONTESTANT' })

        // Open the filters panel
        const filtersButton = screen.getByText('Filtros')
        filtersButton.click()

        await waitFor(() => {
          expect(screen.getByPlaceholderText('Autor (nickname)')).toBeInTheDocument()
        })

        // Status and accessibility selects should not be present for CONTESTANT
        expect(screen.queryByText('Todos los estados')).not.toBeInTheDocument()
        expect(screen.queryByText('Todo el acceso')).not.toBeInTheDocument()
      })

      it('does not render DRAFT badges or management columns', async () => {
        renderWithProviders(<ProblemsPage />, { role: 'CONTESTANT' })

        // Wait for the table to render with problem data
        await waitFor(() => {
          expect(screen.getByText('Two Sum')).toBeInTheDocument()
        })

        // CONTESTANT should not see "Borrador" badges (DRAFT status)
        expect(screen.queryByText('Borrador')).not.toBeInTheDocument()

        // Management column headers should not be present
        expect(screen.queryByText('Estado')).not.toBeInTheDocument()
        expect(screen.queryByText('Acceso')).not.toBeInTheDocument()
      })
    })

    describe('ADMIN role', () => {
      beforeEach(() => {
        localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
      })

      it('renders the "Crear problema" button', async () => {
        renderWithProviders(<ProblemsPage />, { role: 'ADMIN' })

        await waitFor(() => {
          expect(screen.getByText('Crear problema')).toBeInTheDocument()
        })
      })

      it('renders status and accessibility filter selects', async () => {
        renderWithProviders(<ProblemsPage />, { role: 'ADMIN' })

        // Open the filters panel
        const filtersButton = screen.getByText('Filtros')
        filtersButton.click()

        await waitFor(() => {
          expect(screen.getByPlaceholderText('Autor (nickname)')).toBeInTheDocument()
        })

        // ADMIN should see both filter selects
        expect(screen.getByText('Todos los estados')).toBeInTheDocument()
        expect(screen.getByText('Todo el acceso')).toBeInTheDocument()
      })

      it('renders management columns (Estado, Acceso) with DRAFT badges', async () => {
        renderWithProviders(<ProblemsPage />, { role: 'ADMIN' })

        // Wait for the table to render
        await waitFor(() => {
          expect(screen.getByText('Two Sum')).toBeInTheDocument()
        })

        // ADMIN sees management column headers
        expect(screen.getByText('Estado')).toBeInTheDocument()
        expect(screen.getByText('Acceso')).toBeInTheDocument()

        // ADMIN sees DRAFT problems with "Borrador" badge
        expect(screen.getByText('Segment Tree Range Query')).toBeInTheDocument()
        expect(screen.getAllByText('Borrador').length).toBeGreaterThan(0)
      })

      it('renders all published and draft problems', async () => {
        renderWithProviders(<ProblemsPage />, { role: 'ADMIN' })

        await waitFor(() => {
          expect(screen.getByText('Two Sum')).toBeInTheDocument()
        })

        // ADMIN sees both published and draft problems
        expect(screen.getByText('Binary Search')).toBeInTheDocument()
        expect(screen.getByText('Segment Tree Range Query')).toBeInTheDocument()
        expect(screen.getByText('Minimum Spanning Tree')).toBeInTheDocument()
      })
    })

    describe('COACH role', () => {
      beforeEach(() => {
        localStorage.setItem('auth_token', 'mock-jwt-token-mariacoach')
      })

      it('renders the "Crear problema" button', async () => {
        renderWithProviders(<ProblemsPage />, { role: 'COACH' })

        await waitFor(() => {
          expect(screen.getByText('Crear problema')).toBeInTheDocument()
        })
      })

      it('renders status and accessibility filter selects', async () => {
        renderWithProviders(<ProblemsPage />, { role: 'COACH' })

        const filtersButton = screen.getByText('Filtros')
        filtersButton.click()

        await waitFor(() => {
          expect(screen.getByPlaceholderText('Autor (nickname)')).toBeInTheDocument()
        })

        expect(screen.getByText('Todos los estados')).toBeInTheDocument()
        expect(screen.getByText('Todo el acceso')).toBeInTheDocument()
      })

      it('renders management columns for owned resources', async () => {
        renderWithProviders(<ProblemsPage />, { role: 'COACH' })

        await waitFor(() => {
          expect(screen.getByText('Two Sum')).toBeInTheDocument()
        })

        // COACH sees management column headers
        expect(screen.getByText('Estado')).toBeInTheDocument()
        expect(screen.getByText('Acceso')).toBeInTheDocument()
      })

      it('sees draft problems where coach is a modifier', async () => {
        renderWithProviders(<ProblemsPage />, { role: 'COACH' })

        await waitFor(() => {
          expect(screen.getByText('Two Sum')).toBeInTheDocument()
        })

        // mariacoach is a modifier on "Minimum Spanning Tree" (DRAFT)
        expect(screen.getByText('Minimum Spanning Tree')).toBeInTheDocument()
      })
    })
  })

  // Feature: frontend-testing, Property 2: Role-based UI element visibility
  // **Validates: Requirements 4.1, 4.4**
  describe('Property 2: Role-based UI element visibility', () => {
    const roleArbitrary = fc.constantFrom<UserRole>('ADMIN', 'COACH', 'CONTESTANT')

    const roleCanCreate: Record<UserRole, boolean> = {
      ADMIN: true,
      COACH: true,
      CONTESTANT: false,
    }

    it('action button visibility matches role permissions for any role', async () => {
      await fc.assert(
        fc.asyncProperty(roleArbitrary, async (role) => {
          // Set auth token matching the role for MSW handler resolution
          if (role === 'ADMIN') {
            localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
          } else if (role === 'COACH') {
            localStorage.setItem('auth_token', 'mock-jwt-token-mariacoach')
          } else {
            localStorage.removeItem('auth_token')
          }

          const { unmount } = renderWithProviders(<ProblemsPage />, { role })

          // Wait for the page to render
          await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Problemas' })).toBeInTheDocument()
          })

          if (roleCanCreate[role]) {
            // ADMIN and COACH should see the "Crear problema" button
            await waitFor(() => {
              expect(screen.getByText('Crear problema')).toBeInTheDocument()
            })
          } else {
            // CONTESTANT should NOT see the "Crear problema" button
            expect(screen.queryByText('Crear problema')).not.toBeInTheDocument()
          }

          // Clean up to avoid leaking DOM state between iterations
          unmount()
        }),
        { numRuns: 100 },
      )
    })
  })
})
