import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { ProblemsPage } from './ProblemsPage'

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
})
