import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { markSessionActive } from '@/lib/tokenStore'
import { saveLastSubmissionLanguage } from '@/lib/lastSubmissionLanguage'
import { renderApp } from './support/renderApp'
import { ANA, installAuthBackend } from './support/authBackend'
import { installSubmissionBackend } from './support/submissionBackend'

afterEach(() => {
  vi.useRealTimers()
})

/** Opens the submit page for two-sum signed in as Ana, with fake timers so the judge's polling is instant. */
async function openSubmitPage(options: Parameters<typeof installSubmissionBackend>[0] = {}) {
  installAuthBackend([ANA], { signedInAs: ANA })
  markSessionActive()
  saveLastSubmissionLanguage('cpp20')
  const judge = installSubmissionBackend(options)
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
  renderApp({ route: '/submit?problem=two-sum' })
  await screen.findByText('Cargar archivo')
  return { judge, user }
}

async function sendSolution(user: ReturnType<typeof userEvent.setup>) {
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(fileInput, new File(['int main() { return 0; }'], 'sol.cpp', { type: 'text/plain' }))
  await user.click(screen.getByRole('button', { name: 'Enviar solución' }))
}

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

describe('enviar una solución y ver el veredicto', () => {
  it('el envío aparece en cola, pasa a ejecutándose y termina con el veredicto sin recargar la página', async () => {
    const { judge, user } = await openSubmitPage()

    await sendSolution(user)

    expect(await screen.findByText('Solución enviada')).toBeInTheDocument()
    const recent = await screen.findByRole('table')
    expect(await within(recent).findByText('Pendiente')).toBeInTheDocument()

    await advance(3_100)
    expect(await within(recent).findByText('Ejecutando')).toBeInTheDocument()

    await advance(3_100)
    expect(await within(recent).findByText('Aceptado')).toBeInTheDocument()
    expect(within(recent).queryByText('Ejecutando')).not.toBeInTheDocument()
    expect(judge.posts).toBe(1)
  })

  it('al llegar el veredicto deja de preguntar al servidor por el envío', async () => {
    const { judge, user } = await openSubmitPage()
    await sendSolution(user)
    await advance(3_100)
    await advance(3_100)
    await within(await screen.findByRole('table')).findByText('Aceptado')
    const readsAtVerdict = judge.listReads

    await advance(20_000)

    expect(judge.listReads).toBe(readsAtVerdict)
  })

  it('si el servidor rechaza el envío avisa y no aparece ninguna fila nueva', async () => {
    const { user } = await openSubmitPage({ rejectWith: { status: 400, code: 'PROBLEM_NOT_PUBLISHED' } })

    await sendSolution(user)

    expect(await screen.findByText('No se pudo enviar la solución')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
