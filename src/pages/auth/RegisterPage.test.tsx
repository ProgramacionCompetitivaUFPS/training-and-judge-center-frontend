import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { RegisterPage } from './RegisterPage'

const toastSpy = vi.fn()

vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: toastSpy }),
}))

vi.mock('@/components/features/GoogleSignInButton', () => ({
  GoogleSignInButton: () => null,
}))

function renderRegister() {
  renderWithProviders(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<div>LOGIN_SENTINEL</div>} />
    </Routes>,
    { initialEntries: ['/register'] },
  )
}

describe('RegisterPage', () => {
  beforeEach(() => toastSpy.mockClear())

  it('renders form fields and submit button', () => {
    renderRegister()

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument()
  })

  it('shows validation errors on empty submit', async () => {
    // Arrange
    const user = userEvent.setup()
    renderRegister()

    // Act
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText('El correo es requerido')).toBeInTheDocument()
      expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
    })
  })

  it('navigates to /login on successful registration', async () => {
    // Arrange
    server.use(
      http.post('http://localhost:8080/api/users', () =>
        HttpResponse.json({ id: 'new-user', nickname: 'testnick' }, { status: 201 }),
      ),
    )
    const user = userEvent.setup()
    renderRegister()

    // Act
    await user.type(screen.getByLabelText(/correo electrónico/i), 'nuevo@test.com')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'Password1!')
    await user.type(screen.getByLabelText(/^confirmar$/i), 'Password1!')
    await user.type(screen.getByLabelText(/nombre completo/i), 'Nuevo Usuario')
    await user.type(screen.getByLabelText(/^nickname$/i), 'nuevonick')
    await user.type(screen.getByLabelText(/ciudad/i), 'Bogotá')
    await user.type(screen.getByLabelText(/institución/i), 'Universidad Test')

    // Country via SearchSelect — type to filter then click first option
    const countryInput = screen.getByPlaceholderText('Busca tu país...')
    await user.type(countryInput, 'Colombia')
    await waitFor(() => expect(screen.getByText('Colombia')).toBeInTheDocument())
    await user.click(screen.getByText('Colombia'))

    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText('LOGIN_SENTINEL')).toBeInTheDocument()
    })
  })

  it('shows error toast on 409 duplicate email', async () => {
    // Arrange
    server.use(
      http.post('http://localhost:8080/api/users', () =>
        HttpResponse.json(
          { error: 'EMAIL_TAKEN', message: 'El correo ya está registrado' },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderRegister()

    // Act — fill minimum valid form
    await user.type(screen.getByLabelText(/correo electrónico/i), 'admin@trainingcenter.com')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'Password1!')
    await user.type(screen.getByLabelText(/^confirmar$/i), 'Password1!')
    await user.type(screen.getByLabelText(/nombre completo/i), 'Luis Admin')
    await user.type(screen.getByLabelText(/^nickname$/i), 'luisadmin')
    await user.type(screen.getByLabelText(/ciudad/i), 'Bogotá')
    await user.type(screen.getByLabelText(/institución/i), 'Universidad Test')

    const countryInput = screen.getByPlaceholderText('Busca tu país...')
    await user.type(countryInput, 'Colombia')
    await waitFor(() => expect(screen.getByText('Colombia')).toBeInTheDocument())
    await user.click(screen.getByText('Colombia'))

    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    // Assert — title distinguishes conflict error from network error ('Error de conexión')
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error', title: 'Error al crear la cuenta' }),
      )
    })
  })

  it('shows validation error when passwords do not match', async () => {
    // Arrange
    const user = userEvent.setup()
    renderRegister()

    // Act — fill required fields but use mismatched passwords
    await user.type(screen.getByLabelText(/correo electrónico/i), 'test@test.com')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'Password1!')
    await user.type(screen.getByLabelText(/^confirmar$/i), 'OtraPassword1!')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
    })
  })
})
