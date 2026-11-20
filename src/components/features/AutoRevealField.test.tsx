import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'

import type { AutoRevealMode } from '@/lib/autoReveal'

import { AutoRevealField } from './AutoRevealField'

interface HarnessProps {
  mode: AutoRevealMode
  onModeChange: (mode: AutoRevealMode) => void
  delayError?: string
}

function Harness({ mode, onModeChange, delayError }: HarnessProps) {
  const { register } = useForm<{ autoRevealDelay?: number }>()
  return (
    <AutoRevealField
      mode={mode}
      onModeChange={onModeChange}
      delayInputProps={register('autoRevealDelay')}
      delayError={delayError}
    />
  )
}

describe('AutoRevealField', () => {
  const user = userEvent.setup()

  it('muestra los tres modos y marca el que coincide con el modo actual', () => {
    render(<Harness mode="onFinish" onModeChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: 'Solo manualmente' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Al terminar la competencia' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Minutos después del fin' })).not.toBeChecked()
  })

  it.each([
    ['Solo manualmente', 'manual'],
    ['Al terminar la competencia', 'onFinish'],
    ['Minutos después del fin', 'delay'],
  ] as const)('al elegir "%s" avisa con el modo %s', async (label, mode) => {
    const onModeChange = vi.fn()
    // Se parte de otro modo: hacer clic en el ya marcado no dispara onChange.
    render(<Harness mode={mode === 'manual' ? 'delay' : 'manual'} onModeChange={onModeChange} />)

    await user.click(screen.getByRole('radio', { name: label }))

    expect(onModeChange).toHaveBeenCalledWith(mode)
  })

  it.each([
    ['manual', false],
    ['onFinish', false],
    ['delay', true],
  ] as const)('en modo %s muestra el input de minutos: %s', (mode, visible) => {
    render(<Harness mode={mode} onModeChange={vi.fn()} />)

    expect(screen.queryAllByLabelText('Minutos de espera')).toHaveLength(visible ? 1 : 0)
  })

  it('muestra el error de los minutos de espera', () => {
    render(<Harness mode="delay" onModeChange={vi.fn()} delayError="Ingresa los minutos de espera (entero, mínimo 1)" />)

    expect(screen.getByText('Ingresa los minutos de espera (entero, mínimo 1)')).toBeInTheDocument()
  })
})
