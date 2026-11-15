import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { RecoverPasswordPage } from './RecoverPasswordPage'

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

function renderPage() {
  renderWithProviders(<RecoverPasswordPage />)
}

describe('RecoverPasswordPage', () => {
  beforeEach(() => mockToast.mockClear())

  it('renders email field and submit button', () => {
    renderPage()
    expect(screen.getByRole('textbox', { name: /correo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviar|recuperar/i })).toBeInTheDocument()
  })

  it('shows validation error on empty submit', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /enviar|recuperar/i }))
    expect(await screen.findByText('El correo es requerido')).toBeInTheDocument()
  })

  it('advances to reset step after successful request', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('http://localhost:8080/api/password/forgot', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )
    renderPage()
    await user.type(screen.getByRole('textbox', { name: /correo/i }), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /enviar código/i }))
    // Verify the ResetStep input field is now rendered (not just the subtitle text)
    await screen.findByRole('textbox', { name: /código de verificación/i })
  })
})
