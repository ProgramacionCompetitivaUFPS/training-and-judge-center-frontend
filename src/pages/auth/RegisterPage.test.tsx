import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { RegisterPage } from './RegisterPage'

const toastSpy = vi.fn()

vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: toastSpy }),
}))

vi.mock('@/components/features/GoogleSignInButton', () => ({
  GoogleSignInButton: () => null,
}))

function renderRegister() {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<div>LOGIN_SENTINEL</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RegisterPage', () => {
  beforeEach(() => toastSpy.mockClear())

  it('renders form fields and submit button', () => {
    renderRegister()

    expect(screen.getByPlaceholderText('tu@correo.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Tu nombre completo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('tu_nick')).toBeInTheDocument()
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
    await user.type(screen.getByPlaceholderText('tu@correo.com'), 'nuevo@test.com')
    await user.type(screen.getAllByPlaceholderText('••••••••')[0], 'Password1!')
    await user.type(screen.getAllByPlaceholderText('••••••••')[1], 'Password1!')
    await user.type(screen.getByPlaceholderText('Tu nombre completo'), 'Nuevo Usuario')
    await user.type(screen.getByPlaceholderText('tu_nick'), 'nuevonick')
    await user.type(screen.getByPlaceholderText('Tu ciudad'), 'Bogotá')
    await user.type(screen.getByPlaceholderText('Universidad'), 'Universidad Test')

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
    await user.type(screen.getByPlaceholderText('tu@correo.com'), 'admin@trainingcenter.com')
    await user.type(screen.getAllByPlaceholderText('••••••••')[0], 'Password1!')
    await user.type(screen.getAllByPlaceholderText('••••••••')[1], 'Password1!')
    await user.type(screen.getByPlaceholderText('Tu nombre completo'), 'Luis Admin')
    await user.type(screen.getByPlaceholderText('tu_nick'), 'luisadmin')
    await user.type(screen.getByPlaceholderText('Tu ciudad'), 'Bogotá')
    await user.type(screen.getByPlaceholderText('Universidad'), 'Universidad Test')

    const countryInput = screen.getByPlaceholderText('Busca tu país...')
    await user.type(countryInput, 'Colombia')
    await waitFor(() => expect(screen.getByText('Colombia')).toBeInTheDocument())
    await user.click(screen.getByText('Colombia'))

    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    // Assert
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error' }),
      )
    })
  })
})
