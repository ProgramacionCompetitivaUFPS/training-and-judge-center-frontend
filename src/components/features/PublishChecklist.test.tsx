import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '@/components/ui'
import { PublishChecklist, type PublishChecklistStep } from './PublishChecklist'

function makeStep(overrides: Partial<PublishChecklistStep> = {}): PublishChecklistStep {
  return {
    key: 'test',
    label: 'Mi paso',
    met: false,
    hint: 'Falta algo',
    actionLabel: 'Ir',
    onAction: vi.fn(),
    ...overrides,
  }
}

function renderChecklist(steps: PublishChecklistStep[], optionalMissing: string[] = []) {
  render(
    <TooltipProvider delayDuration={0}>
      <PublishChecklist steps={steps} optionalMissing={optionalMissing} onOptionalAction={vi.fn()} />
    </TooltipProvider>,
  )
}

describe('PublishChecklist', () => {
  it('muestra el contador "X de Y listos"', () => {
    const steps = [makeStep({ met: true }), makeStep({ key: 'b', met: false, label: 'Otro' })]
    renderChecklist(steps)
    expect(screen.getByText('1 de 2 listos')).toBeInTheDocument()
  })

  it('muestra icono Check para un paso cumplido', () => {
    renderChecklist([makeStep({ met: true, label: 'Enunciado' })])
    expect(screen.getByLabelText('Listo')).toBeInTheDocument()
  })

  it('muestra icono CircleDashed para un paso pendiente', () => {
    renderChecklist([makeStep({ met: false })])
    expect(screen.getByLabelText('Pendiente')).toBeInTheDocument()
  })

  it('muestra icono Loader2 cuando el paso está cargando', () => {
    renderChecklist([makeStep({ met: false, loading: true })])
    expect(screen.getByLabelText('En curso')).toBeInTheDocument()
  })

  it('muestra el hint de un paso pendiente', () => {
    renderChecklist([makeStep({ met: false, hint: 'Faltan datos' })])
    expect(screen.getByText('Faltan datos')).toBeInTheDocument()
  })

  it('muestra el botón de acción para un paso pendiente', () => {
    renderChecklist([makeStep({ met: false, actionLabel: 'Subir', onAction: vi.fn() })])
    expect(screen.getByRole('button', { name: /subir/i })).toBeInTheDocument()
  })

  it('deshabilita el botón de acción cuando step.disabled es true', () => {
    renderChecklist([makeStep({ met: false, disabled: true, actionLabel: 'Ir' })])
    expect(screen.getByRole('button', { name: /ir/i })).toBeDisabled()
  })

  it('muestra el enlace "Ver detalle" cuando el paso tiene onDetail', () => {
    renderChecklist([makeStep({ met: false, onDetail: vi.fn() })])
    expect(screen.getByRole('button', { name: /ver detalle/i })).toBeInTheDocument()
  })

  it('muestra los opcionales faltantes', () => {
    renderChecklist([makeStep({ met: true })], ['checker'])
    expect(screen.getByText(/checker/i)).toBeInTheDocument()
  })

  it('muestra "Todo listo" cuando todos los pasos están cumplidos', () => {
    renderChecklist([makeStep({ met: true }), makeStep({ key: 'b', met: true, label: 'Otro' })])
    expect(screen.getByText(/todo listo/i)).toBeInTheDocument()
  })

  it('muestra el texto de instrucción cuando hay pasos pendientes', () => {
    renderChecklist([makeStep({ met: false })])
    expect(screen.getByText(/publicar se habilita/i)).toBeInTheDocument()
  })

  it('muestra AlertTriangle (no Check) cuando el paso está cumplido pero tiene warning', () => {
    renderChecklist([makeStep({ met: true, warning: 'No hay casos secretos.' })])
    expect(screen.queryByLabelText('Listo')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Advertencia')).toBeInTheDocument()
  })

  it('el ícono de advertencia tiene tooltip con el texto del warning', async () => {
    const user = userEvent.setup()
    renderChecklist([makeStep({ met: true, warning: 'No hay casos secretos.' })])
    await user.hover(screen.getByLabelText('Advertencia'))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('No hay casos secretos.')
  })

  it('la fila con advertencia recibe el foco con Tab y muestra el tooltip', async () => {
    const user = userEvent.setup()
    renderChecklist([makeStep({ met: true, label: 'Casos de prueba', warning: 'No hay casos secretos.' })])
    await user.tab()
    expect(screen.getByText('Casos de prueba').closest('li')).toHaveFocus()
    expect(await screen.findByRole('tooltip')).toHaveTextContent('No hay casos secretos.')
  })

  it('las filas sin advertencia no entran en el orden de tabulación', () => {
    renderChecklist([makeStep({ met: true, label: 'Enunciado' })])
    expect(screen.getByText('Enunciado').closest('li')).not.toHaveAttribute('tabindex')
  })

  it('el tooltip de advertencia aparece al pasar el mouse por el texto de la fila', async () => {
    const user = userEvent.setup()
    renderChecklist([makeStep({ met: true, label: 'Casos de prueba', warning: 'No hay casos secretos.' })])
    await user.hover(screen.getByText('Casos de prueba'))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('No hay casos secretos.')
  })
})
