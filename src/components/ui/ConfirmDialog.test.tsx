import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

function renderDialog(overrides?: Partial<Parameters<typeof ConfirmDialog>[0]>) {
  const defaults = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Eliminar',
    description: '¿Seguro?',
    onConfirm: vi.fn(),
  }
  render(<ConfirmDialog {...defaults} {...overrides} />)
  return defaults
}

describe('ConfirmDialog', () => {
  it('no renderiza contenido cuando open es false', () => {
    render(
      <ConfirmDialog open={false} onOpenChange={vi.fn()} title="Eliminar" description="¿Seguro?" onConfirm={vi.fn()} />,
    )
    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument()
  })

  it('renderiza title y description cuando open es true', () => {
    renderDialog()
    expect(screen.getByText('Eliminar')).toBeInTheDocument()
    expect(screen.getByText('¿Seguro?')).toBeInTheDocument()
  })

  it('llama onOpenChange(false) cuando se hace click en Cancelar', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('llama onConfirm cuando se hace click en el botón de confirmación', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderDialog({ onConfirm })
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('usa confirmLabel y cancelLabel personalizados', () => {
    renderDialog({ confirmLabel: 'Sí, eliminar', cancelLabel: 'No' })
    expect(screen.getByRole('button', { name: 'Sí, eliminar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument()
  })

  it('deshabilita ambos botones cuando isLoading es true', () => {
    renderDialog({ isLoading: true })
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Confirmar/ })).toBeDisabled()
  })
})
