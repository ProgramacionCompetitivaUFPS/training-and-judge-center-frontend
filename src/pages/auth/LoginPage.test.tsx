import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { LoginPage } from './LoginPage'

const toastSpy = vi.fn()

vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: toastSpy }),
}))

vi.mock('@/components/features/GoogleSignInButton', () => ({
  GoogleSignInButton: () => null,
}))

function renderLogin() {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>DASHBOARD_SENTINEL</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => toastSpy.mockClear())

  it('muestra los campos y el botón del formulario de login', () => {
    // Arrange
    renderLogin()

    // Assert
    expect(screen.getByPlaceholderText('tu@correo.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('muestra errores de validación al enviar formulario vacío', async () => {
    // Arrange
    const user = userEvent.setup()
    renderLogin()

    // Act
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText('El correo es requerido')).toBeInTheDocument()
      expect(screen.getByText('La contraseña es requerida')).toBeInTheDocument()
    })
  })

  it('navega a /dashboard tras un login exitoso', async () => {
    // Arrange
    const user = userEvent.setup()
    renderLogin()

    // Act
    await user.type(screen.getByPlaceholderText('tu@correo.com'), 'admin@trainingcenter.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText('DASHBOARD_SENTINEL')).toBeInTheDocument()
    })
  })

  it('muestra toast de credenciales incorrectas cuando el servidor responde 401', async () => {
    // Arrange
    server.use(
      http.post('http://localhost:8080/api/auth/login', () =>
        HttpResponse.json({ error: 'UNAUTHORIZED', message: 'Credenciales incorrectas' }, { status: 401 }),
      ),
    )
    const user = userEvent.setup()
    renderLogin()

    // Act
    await user.type(screen.getByPlaceholderText('tu@correo.com'), 'admin@trainingcenter.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    // Assert
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error', title: 'Credenciales incorrectas' }),
      )
    })
  })
})
