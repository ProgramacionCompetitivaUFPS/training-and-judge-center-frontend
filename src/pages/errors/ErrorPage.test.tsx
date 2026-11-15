import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ErrorPage } from './ErrorPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    hasRole: () => false,
    logout: vi.fn(),
  }),
}))

function renderPage(message?: string) {
  render(
    <MemoryRouter>
      <ErrorPage message={message} />
    </MemoryRouter>,
  )
}

describe('ErrorPage', () => {
  it('renders default error message', () => {
    renderPage()
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(screen.getByText(/No se pudo cargar la página/i)).toBeInTheDocument()
  })

  it('renders custom message when provided', () => {
    renderPage('El servidor no está disponible.')
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(screen.getByText('El servidor no está disponible.')).toBeInTheDocument()
  })

  it('renders Volver and Ir al inicio buttons', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ir al inicio/i })).toBeInTheDocument()
  })
})
