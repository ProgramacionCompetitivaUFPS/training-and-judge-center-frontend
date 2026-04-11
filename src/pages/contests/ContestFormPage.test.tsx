import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { ContestFormPage } from './ContestFormPage'

/**
 * Helper: renders ContestFormPage in create mode.
 * The route is /groups/:groupId/contests/new — we provide a groupId param.
 * Sets localStorage auth token for ADMIN so MSW handlers resolve correctly.
 */
function renderCreateForm() {
  return renderWithProviders(<ContestFormPage />, {
    role: 'ADMIN',
    initialRoute: '/groups/group-1/contests/new',
  })
}

describe('ContestFormPage — form validation UX', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  // Requirement 6.1: submitting empty required fields shows error messages
  describe('empty required fields', () => {
    it('shows error messages for name, startTime, and endTime when submitting empty form', async () => {
      const user = userEvent.setup()
      renderCreateForm()

      // Wait for the form heading to render
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Nueva competencia' }),
        ).toBeInTheDocument()
      })

      // Clear the default penalty value so we can focus on required fields
      const submitButton = screen.getByRole('button', { name: 'Crear competencia' })
      await user.click(submitButton)

      // Name, startTime, and endTime are required — errors should appear
      await waitFor(() => {
        expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
      })
      expect(screen.getByText('La fecha de inicio es requerida')).toBeInTheDocument()
      expect(screen.getByText('La fecha de fin es requerida')).toBeInTheDocument()
    })
  })

  // Requirement 6.2: submitting values exceeding length constraints shows Zod error
  describe('length constraint violations', () => {
    it('shows error when name exceeds 200 characters', async () => {
      const user = userEvent.setup()
      renderCreateForm()

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Crear competencia' }),
        ).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText('Nombre')
      await user.type(nameInput, 'a'.repeat(201))

      const submitButton = screen.getByRole('button', { name: 'Crear competencia' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText('El nombre no puede exceder 200 caracteres'),
        ).toBeInTheDocument()
      })
    })
  })

  // Requirement 6.3: correcting an invalid field and re-submitting clears the error
  describe('error clearing on correction', () => {
    it('clears name error after correcting and re-submitting', async () => {
      const user = userEvent.setup()
      renderCreateForm()

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Crear competencia' }),
        ).toBeInTheDocument()
      })

      // Submit empty to trigger errors
      const submitButton = screen.getByRole('button', { name: 'Crear competencia' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
      })

      // Correct the name field
      const nameInput = screen.getByLabelText('Nombre')
      await user.type(nameInput, 'Contest Semanal #15')

      // Also fill required date fields
      const startInput = screen.getByLabelText('Fecha y hora de inicio')
      const endInput = screen.getByLabelText('Fecha y hora de fin')
      await user.type(startInput, '2025-06-01T10:00')
      await user.type(endInput, '2025-06-01T15:00')

      // Re-submit
      await user.click(submitButton)

      // The name error should be cleared
      await waitFor(() => {
        expect(
          screen.queryByText('El nombre es requerido'),
        ).not.toBeInTheDocument()
      })
    })
  })

  // Requirement 6.4: displayed error messages match Zod schema messages
  describe('error messages match Zod schema', () => {
    it('displays the exact Zod error for empty required name', async () => {
      const user = userEvent.setup()
      renderCreateForm()

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Crear competencia' }),
        ).toBeInTheDocument()
      })

      const submitButton = screen.getByRole('button', { name: 'Crear competencia' })
      await user.click(submitButton)

      // These messages must match exactly what's defined in createContestSchema
      await waitFor(() => {
        expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
        expect(screen.getByText('La fecha de inicio es requerida')).toBeInTheDocument()
        expect(screen.getByText('La fecha de fin es requerida')).toBeInTheDocument()
      })
    })

    it('displays the exact Zod error for name exceeding max length', async () => {
      const user = userEvent.setup()
      renderCreateForm()

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Crear competencia' }),
        ).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText('Nombre')
      await user.type(nameInput, 'a'.repeat(201))

      const submitButton = screen.getByRole('button', { name: 'Crear competencia' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText('El nombre no puede exceder 200 caracteres'),
        ).toBeInTheDocument()
      })
    })
  })
})
