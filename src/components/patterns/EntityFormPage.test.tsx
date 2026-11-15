import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { mockCurrentUser } from '@/mocks/data'
import { EntityFormPage } from './EntityFormPage'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockCurrentUser, isAuthenticated: true, hasRole: () => false, logout: vi.fn() }),
}))

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

const baseProps = {
  title: 'Formulario de prueba',
  breadcrumbs: [],
  onSubmit: vi.fn(),
  children: <input name="campo" aria-label="Campo" />,
}

describe('EntityFormPage', () => {
  it('muestra spinner cuando isLoading es true', () => {
    renderWithProviders(<EntityFormPage {...baseProps} isLoading />)
    expect(screen.getByLabelText('Cargando')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Formulario de prueba' })).not.toBeInTheDocument()
  })

  it('muestra el título cuando no está cargando', () => {
    renderWithProviders(<EntityFormPage {...baseProps} />)
    expect(screen.getByRole('heading', { name: 'Formulario de prueba' })).toBeInTheDocument()
  })

  it('muestra el mensaje de error cuando se pasa error prop', () => {
    renderWithProviders(<EntityFormPage {...baseProps} error="Error al guardar" />)
    expect(screen.getByText('Error al guardar')).toBeInTheDocument()
  })

  it('muestra errores de validación cuando se pasan', () => {
    renderWithProviders(
      <EntityFormPage {...baseProps} validationErrors={{ nombre: 'El nombre es requerido' }} />,
    )
    expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
  })

  it('llama onSubmit al enviar el formulario', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderWithProviders(<EntityFormPage {...baseProps} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /Guardar/ }))
    expect(onSubmit).toHaveBeenCalled()
  })

  it('llama onCancel al hacer click en Cancelar', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithProviders(<EntityFormPage {...baseProps} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: /Cancelar/ }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('deshabilita el botón de guardar cuando isSubmitting es true', () => {
    renderWithProviders(<EntityFormPage {...baseProps} isSubmitting />)
    expect(screen.getByRole('button', { name: /Guardar/ })).toBeDisabled()
  })

  it('usa submitLabel y cancelLabel personalizados', () => {
    renderWithProviders(
      <EntityFormPage {...baseProps} submitLabel="Crear" cancelLabel="Volver" onCancel={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /Crear/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Volver/ })).toBeInTheDocument()
  })
})
