import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { markSessionActive } from '@/lib/tokenStore'
import { renderApp } from './support/renderApp'
import { ANA, ROOT, installAuthBackend } from './support/authBackend'
import { installFrozenContestBackend } from './support/contestBackend'

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement

describe('tabla de posiciones: congelar y revelar resultados', () => {
  it('un líder ve la tabla congelada, revela los resultados y ve la tabla final con los intentos fallidos', async () => {
    installAuthBackend([ROOT], { signedInAs: ROOT })
    markSessionActive()
    const contest = installFrozenContestBackend('LEAD')
    const user = userEvent.setup()
    renderApp({ route: contest.standingsUrl })

    // Frozen: Ana's second problem is hidden behind "2 sin revelar" and the notice says who reveals it
    expect(await screen.findByText(/La competencia terminó, pero los resultados aún no se revelan/)).toBeInTheDocument()
    expect(within(rowOf('Ana Pérez')).getByText('2 envíos sin revelar')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Revelar resultados' }))
    await user.click(await screen.findByRole('button', { name: 'Revelar' }))

    // Final: no notice, no hidden submissions, and the accepted cell shows how many attempts it took (+2)
    expect(await screen.findByText('Resultados revelados')).toBeInTheDocument()
    expect(await within(rowOf('Ana Pérez')).findByText('+2')).toBeInTheDocument()
    expect(within(rowOf('Ana Pérez')).queryByText(/sin revelar/)).not.toBeInTheDocument()
    expect(screen.queryByText(/los resultados aún no se revelan/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revelar resultados' })).not.toBeInTheDocument()
    expect(contest.state.revealCalls).toBe(1)
  })

  it('en la tabla final una celda aceptada a la primera muestra «+», la rechazada muestra los intentos y la vacía un punto', async () => {
    installAuthBackend([ROOT], { signedInAs: ROOT })
    markSessionActive()
    const contest = installFrozenContestBackend('LEAD')
    contest.state.revealed = true
    renderApp({ route: contest.standingsUrl })

    await screen.findByText('Ana Pérez')
    const ana = rowOf('Ana Pérez')
    expect(within(ana).getByText('+2')).toBeInTheDocument()
    expect(within(ana).getByText('+')).toBeInTheDocument()
    const beto = rowOf('Beto Ruiz')
    expect(within(beto).getByText('-3')).toBeInTheDocument()
    expect(within(beto).getByLabelText('Sin intentos')).toBeInTheDocument()
  })

  it('un competidor ve la tabla congelada pero no puede revelar los resultados', async () => {
    installAuthBackend([ANA], { signedInAs: ANA })
    markSessionActive()
    const contest = installFrozenContestBackend('MEMBER')
    renderApp({ route: contest.standingsUrl })

    expect(await screen.findByText(/La competencia terminó, pero los resultados aún no se revelan/)).toBeInTheDocument()
    expect(within(rowOf('Ana Pérez')).getByText('2 envíos sin revelar')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revelar resultados' })).not.toBeInTheDocument()
  })
})
