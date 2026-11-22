import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { markSessionActive } from '@/lib/tokenStore'
import { renderApp } from './support/renderApp'
import { ROOT, installAuthBackend } from './support/authBackend'
import { installContestEditBackend } from './support/contestEditBackend'

describe('editar una competencia con conflicto de edición', () => {
  it('si otra persona guardó antes, avisa, trae sus cambios y conserva lo que se estaba escribiendo', async () => {
    installAuthBackend([ROOT], { signedInAs: ROOT })
    markSessionActive()
    const contest = installContestEditBackend()
    const user = userEvent.setup()
    renderApp({ route: contest.editUrl })

    const name = await screen.findByDisplayValue(contest.originalName)
    expect(screen.getByLabelText('Descripción')).toHaveValue(contest.originalDescription)
    await user.clear(name)
    await user.type(name, 'Nombre que escribí yo')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    // The conflict is explained, and the form is refreshed with the other person's description...
    expect(await screen.findByText('La competencia cambió')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Descripción')).toHaveValue('Descripción escrita por otra persona'))
    // ...without throwing away the name this person had typed
    expect(screen.getByLabelText('Nombre')).toHaveValue('Nombre que escribí yo')
    expect(contest.state.putBodies).toHaveLength(1)
    expect(contest.state.putBodies[0].name).toBe('Nombre que escribí yo')
    expect(screen.getByRole('heading', { name: 'Editar competencia' })).toBeInTheDocument()
  })
})
