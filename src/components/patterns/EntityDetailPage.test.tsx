import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { mockCurrentUser } from '@/mocks/data'
import { EntityDetailPage } from './EntityDetailPage'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockCurrentUser, isAuthenticated: true, hasRole: () => false, logout: vi.fn() }),
}))

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

const baseProps = {
  title: 'Detalle de entidad',
  breadcrumbs: [],
}

describe('EntityDetailPage', () => {
  it('muestra spinner cuando isLoading es true', () => {
    renderWithProviders(<EntityDetailPage {...baseProps} isLoading />)
    expect(screen.getByLabelText('Cargando')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Detalle de entidad' })).not.toBeInTheDocument()
  })

  it('muestra el título cuando no está cargando', () => {
    renderWithProviders(<EntityDetailPage {...baseProps} />)
    expect(screen.getByRole('heading', { name: 'Detalle de entidad' })).toBeInTheDocument()
  })

  it('muestra subtitle cuando se pasa la prop', () => {
    renderWithProviders(<EntityDetailPage {...baseProps} subtitle="Subtítulo de prueba" />)
    expect(screen.getByText('Subtítulo de prueba')).toBeInTheDocument()
  })

  it('renderiza el botón de primaryAction', () => {
    renderWithProviders(
      <EntityDetailPage
        {...baseProps}
        primaryAction={{ label: 'Acción principal', onClick: vi.fn() }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Acción principal' })).toBeInTheDocument()
  })

  it('llama onEdit al hacer click en Editar del dropdown', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    renderWithProviders(<EntityDetailPage {...baseProps} onEdit={onEdit} />)
    await user.click(screen.getByLabelText('Más acciones'))
    await user.click(screen.getByRole('menuitem', { name: /Editar/ }))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('llama onDelete al hacer click en Eliminar del dropdown', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderWithProviders(<EntityDetailPage {...baseProps} onDelete={onDelete} />)
    await user.click(screen.getByLabelText('Más acciones'))
    await user.click(screen.getByRole('menuitem', { name: /Eliminar/ }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('renderiza pestañas y permite cambiar de tab', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    const tabs = [
      { id: 'tab-a', label: 'Tab A', content: <div>Contenido A</div> },
      { id: 'tab-b', label: 'Tab B', content: <div>Contenido B</div> },
    ]
    renderWithProviders(
      <EntityDetailPage {...baseProps} tabs={tabs} activeTab="tab-a" onTabChange={onTabChange} />,
    )
    expect(screen.getByRole('tab', { name: 'Tab A' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Tab B' }))
    expect(onTabChange).toHaveBeenCalledWith('tab-b')
  })
})
