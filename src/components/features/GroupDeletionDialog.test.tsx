import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/renderWithProviders'
import { stubEndpoint } from '@/test/hookHarness'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { GroupDeletionDialog } from './GroupDeletionDialog'

const IMPACT_URL = '/groups/group-1/deletion-impact'

const QUIET_IMPACT = { contests: 3, activeContests: 0, materials: 1, members: 1, submissions: 40 }

beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
afterEach(() => clearAccessToken())

function renderDialog(overrides: Partial<React.ComponentProps<typeof GroupDeletionDialog>> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    groupId: 'group-1',
    groupName: 'ICPC Colombia',
    isDeleting: false,
    onConfirm: vi.fn(),
    ...overrides,
  }
  renderWithProviders(<GroupDeletionDialog {...props} />)
  return props
}

const deleteButton = () => screen.getByRole('button', { name: 'Eliminar' })

describe('GroupDeletionDialog', () => {
  it('resume qué se elimina con los plurales correctos', async () => {
    stubEndpoint('get', IMPACT_URL, { body: { ...QUIET_IMPACT, contests: 3, materials: 1, members: 1 } })

    renderDialog()

    expect(
      await screen.findByText(/Se eliminan 3 competencias \(con sus posiciones\) y 1 material; 1 miembro deja el grupo\./),
    ).toBeInTheDocument()
  })

  it('usa plurales cuando hay un solo contest y varios miembros', async () => {
    stubEndpoint('get', IMPACT_URL, { body: { ...QUIET_IMPACT, contests: 1, materials: 4, members: 12 } })

    renderDialog()

    expect(
      await screen.findByText(/Se eliminan 1 competencia \(con sus posiciones\) y 4 materiales; 12 miembros dejan el grupo\./),
    ).toBeInTheDocument()
  })

  it('mantiene Eliminar deshabilitado hasta que se escribe el nombre exacto del grupo', async () => {
    stubEndpoint('get', IMPACT_URL, { body: QUIET_IMPACT })
    const user = userEvent.setup()
    renderDialog()
    await screen.findByText(/Se eliminan/)

    expect(deleteButton()).toBeDisabled()
    await user.type(screen.getByPlaceholderText('Nombre del grupo'), 'ICPC Colomb')
    expect(deleteButton()).toBeDisabled()
    await user.type(screen.getByPlaceholderText('Nombre del grupo'), 'ia')

    expect(deleteButton()).toBeEnabled()
  })

  it('llama a onConfirm con el nombre escrito al confirmar', async () => {
    stubEndpoint('get', IMPACT_URL, { body: QUIET_IMPACT })
    const user = userEvent.setup()
    const props = renderDialog()
    await screen.findByText(/Se eliminan/)

    await user.type(screen.getByPlaceholderText('Nombre del grupo'), 'ICPC Colombia')
    await user.click(deleteButton())

    expect(props.onConfirm).toHaveBeenCalledTimes(1)
    expect(props.onConfirm).toHaveBeenCalledWith('ICPC Colombia')
  })

  it('no pide reconocimiento cuando no hay competencias activas', async () => {
    stubEndpoint('get', IMPACT_URL, { body: QUIET_IMPACT })
    renderDialog()
    await screen.findByText(/Se eliminan/)

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  describe('con competencias activas', () => {
    it('advierte de ellas y exige marcar que se entiende antes de eliminar', async () => {
      stubEndpoint('get', IMPACT_URL, { body: { ...QUIET_IMPACT, activeContests: 2 } })
      const user = userEvent.setup()
      renderDialog()

      expect(await screen.findByRole('alert')).toHaveTextContent('Hay 2 competencias activas en este momento.')
      await user.type(screen.getByPlaceholderText('Nombre del grupo'), 'ICPC Colombia')
      expect(deleteButton()).toBeDisabled()

      await user.click(screen.getByRole('checkbox', { name: /Entiendo que se eliminan las competencias activas/ }))

      expect(deleteButton()).toBeEnabled()
    })

    it('usa el singular cuando hay una sola competencia activa', async () => {
      stubEndpoint('get', IMPACT_URL, { body: { ...QUIET_IMPACT, activeContests: 1 } })

      renderDialog()

      expect(await screen.findByRole('alert')).toHaveTextContent('Hay 1 competencia activa en este momento.')
    })
  })

  describe('cuando no se puede calcular el impacto', () => {
    it('avisa, asume lo peor y exige el reconocimiento antes de eliminar', async () => {
      stubEndpoint('get', IMPACT_URL, { status: 500, body: { error: 'SERVER_ERROR', message: 'fallo' } })
      const user = userEvent.setup()
      renderDialog()

      expect(await screen.findByRole('status')).toHaveTextContent('No se pudo calcular qué contiene el grupo.')
      await user.type(screen.getByPlaceholderText('Nombre del grupo'), 'ICPC Colombia')
      expect(deleteButton()).toBeDisabled()

      await user.click(screen.getByRole('checkbox', { name: /Entiendo que se elimina todo lo que contiene el grupo/ }))

      expect(deleteButton()).toBeEnabled()
    })
  })

  it('no consulta el impacto mientras el diálogo está cerrado', async () => {
    const calls = stubEndpoint('get', IMPACT_URL, { body: QUIET_IMPACT })

    renderDialog({ open: false })
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(calls).toHaveLength(0)
  })

  it('muestra el aviso de cálculo mientras llega el impacto', () => {
    stubEndpoint('get', IMPACT_URL, { body: QUIET_IMPACT })

    renderDialog()

    expect(screen.getByText('Calculando qué se perdería…')).toBeInTheDocument()
  })

  describe('al cerrar', () => {
    it('Cancelar avisa con onOpenChange(false) y borra lo escrito', async () => {
      stubEndpoint('get', IMPACT_URL, { body: QUIET_IMPACT })
      const user = userEvent.setup()
      const props = renderDialog()
      await screen.findByText(/Se eliminan/)
      await user.type(screen.getByPlaceholderText('Nombre del grupo'), 'ICPC')

      await user.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(props.onOpenChange).toHaveBeenCalledWith(false)
      expect(screen.getByPlaceholderText('Nombre del grupo')).toHaveValue('')
    })

    it('mientras se elimina no se puede cancelar ni cerrar con Escape', async () => {
      stubEndpoint('get', IMPACT_URL, { body: QUIET_IMPACT })
      const user = userEvent.setup()
      const props = renderDialog({ isDeleting: true })
      await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled())

      await user.keyboard('{Escape}')

      expect(props.onOpenChange).not.toHaveBeenCalled()
    })
  })
})
