import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { RecoverPasswordPage } from './RecoverPasswordPage'

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

function renderPage() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <RecoverPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
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
    const matches = await screen.findAllByText(/correo/i)
    expect(matches.length).toBeGreaterThan(1)
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
    await waitFor(() => {
      expect(screen.getByText(/código de verificación/i)).toBeInTheDocument()
    })
  })
})
