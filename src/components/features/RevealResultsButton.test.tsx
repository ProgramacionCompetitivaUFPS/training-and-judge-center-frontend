import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockContestReveals } from '@/mocks/data'

import { RevealResultsButton } from './RevealResultsButton'

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

const REVEAL_URL = 'http://localhost:8080/api/groups/:groupId/contests/:contestId/reveal-results'

function renderButton(contestId = 'contest-9') {
  return renderWithProviders(<RevealResultsButton groupId="group-1" contestId={contestId} />)
}

describe('RevealResultsButton', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockContestReveals.clear()
    mockToast.mockClear()
  })

  afterEach(() => {
    clearAccessToken()
  })

  it('pide confirmación antes de revelar y no envía nada todavía', async () => {
    let requests = 0
    server.use(
      http.post(REVEAL_URL, () => {
        requests += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Revelar resultados' }))

    expect(screen.getByText(/Esta acción no se puede deshacer\./)).toBeInTheDocument()
    expect(requests).toBe(0)
  })

  it('no envía nada al cancelar la confirmación', async () => {
    let requests = 0
    server.use(
      http.post(REVEAL_URL, () => {
        requests += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Revelar resultados' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(requests).toBe(0)
  })

  it('revela, avisa y cierra el diálogo al confirmar', async () => {
    renderButton('contest-9')

    await user.click(screen.getByRole('button', { name: 'Revelar resultados' }))
    await user.click(screen.getByRole('button', { name: 'Revelar' }))

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success', title: 'Resultados revelados' }),
      ),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it.each([
    [403, 'INSUFFICIENT_PERMISSIONS', 'No tienes permisos para realizar esta acción'],
    [409, 'CONTEST_NOT_FINISHED', 'La competencia aún no ha terminado, no se pueden revelar los resultados'],
    [409, 'CONTEST_HAS_NO_FREEZE', 'Esta competencia no tiene freeze, no hay resultados que revelar'],
  ] as const)('con %s %s muestra el mensaje mapeado y cierra el diálogo', async (status, code, description) => {
    server.use(http.post(REVEAL_URL, () => HttpResponse.json({ error: code, message: 'x' }, { status })))
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Revelar resultados' }))
    await user.click(screen.getByRole('button', { name: 'Revelar' }))

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error', title: 'No se pudo revelar', description }),
      ),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
