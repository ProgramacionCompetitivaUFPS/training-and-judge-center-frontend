import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen, waitFor, server } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { ProblemFormPage } from './ProblemFormPage'
import { ToastProvider } from '@/components/layout/ToastProvider'

const API_URL = 'http://localhost:8080/api'

/**
 * Helper: renders ProblemFormPage (create mode) wrapped with ToastProvider.
 */
function renderCreateForm() {
  return renderWithProviders(
    <ToastProvider>
      <ProblemFormPage />
    </ToastProvider>,
    { role: 'ADMIN', initialRoute: '/problems/new' },
  )
}

/**
 * Helper: fills the create form with fully valid data and submits.
 * Includes timeLimit and memoryLimit to avoid NaN validation errors
 * from empty number inputs with valueAsNumber: true.
 */
async function fillAndSubmitForm(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
  })

  await user.type(screen.getByLabelText('Slug'), 'test-problem')
  await user.type(screen.getByLabelText('Título'), 'Test Problem Title')
  await user.type(screen.getByLabelText('Tiempo límite (ms)'), '2000')
  await user.type(screen.getByLabelText('Memoria límite (MiB)'), '256')

  await user.click(screen.getByRole('button', { name: 'Crear' }))
}

describe('ProblemFormPage — API error handling', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  // Requirement 7.1: 401 Unauthorized shows auth error notification
  it('shows auth error toast when API returns 401 Unauthorized', async () => {
    server.use(
      http.post(`${API_URL}/problems`, () =>
        HttpResponse.json(
          { error: 'UNAUTHORIZED', message: 'Token requerido' },
          { status: 401 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderCreateForm()
    await fillAndSubmitForm(user)

    await waitFor(() => {
      expect(screen.getByText('Token requerido')).toBeInTheDocument()
    })
  })

  // Requirement 7.2: 403 Forbidden shows access denied message
  it('shows access denied toast when API returns 403 Forbidden', async () => {
    server.use(
      http.post(`${API_URL}/problems`, () =>
        HttpResponse.json(
          { error: 'INSUFFICIENT_PERMISSIONS', message: 'Solo Coach y Admin pueden crear problemas' },
          { status: 403 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderCreateForm()
    await fillAndSubmitForm(user)

    await waitFor(() => {
      expect(screen.getByText('Solo Coach y Admin pueden crear problemas')).toBeInTheDocument()
    })
  })

  // Requirement 7.3: 500 Internal Server Error shows generic error without technical details
  it('shows generic error toast when API returns 500 Internal Server Error', async () => {
    server.use(
      http.post(`${API_URL}/problems`, () =>
        HttpResponse.json(
          { error: 'INTERNAL_ERROR', message: 'Internal server error' },
          { status: 500 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderCreateForm()
    await fillAndSubmitForm(user)

    await waitFor(() => {
      expect(screen.getByText('Internal server error')).toBeInTheDocument()
    })
  })

  // Requirement 7.4: Network error shows connectivity error message
  it('shows error toast when a network error occurs', async () => {
    server.use(
      http.post(`${API_URL}/problems`, () => HttpResponse.error()),
    )

    const user = userEvent.setup()
    renderCreateForm()
    await fillAndSubmitForm(user)

    await waitFor(() => {
      // Network errors are not ApiClientError instances, so the generic fallback is shown
      expect(screen.getByText('Error al crear')).toBeInTheDocument()
    })
  })

  // Requirement 7.5: 409 Conflict shows error message on the form
  it('shows conflict error toast when API returns 409 (duplicate slug)', async () => {
    server.use(
      http.post(`${API_URL}/problems`, () =>
        HttpResponse.json(
          { error: 'SLUG_ALREADY_EXISTS', message: "Ya existe un problema con slug 'test-problem'" },
          { status: 409 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderCreateForm()
    await fillAndSubmitForm(user)

    await waitFor(() => {
      expect(screen.getByText("Ya existe un problema con slug 'test-problem'")).toBeInTheDocument()
    })
  })
})
