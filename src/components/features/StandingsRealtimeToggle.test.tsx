import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StandingsRealtimeToggle } from './StandingsRealtimeToggle'

describe('StandingsRealtimeToggle', () => {
  const user = userEvent.setup()

  it('marca el botón como no pulsado cuando la vista de participantes está activa', () => {
    render(<StandingsRealtimeToggle active={false} onToggle={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Ver resultados reales' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('marca el botón como pulsado y conserva su nombre accesible cuando la vista real está activa', () => {
    render(<StandingsRealtimeToggle active={true} onToggle={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Ver resultados reales' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('llama a onToggle una vez al pulsarlo', async () => {
    // Arrange
    const onToggle = vi.fn()
    render(<StandingsRealtimeToggle active={false} onToggle={onToggle} />)

    // Act
    await user.click(screen.getByRole('button', { name: 'Ver resultados reales' }))

    // Assert
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('muestra el tooltip para encender la vista real cuando está apagado', async () => {
    render(<StandingsRealtimeToggle active={false} onToggle={vi.fn()} />)

    await user.hover(screen.getByRole('button', { name: 'Ver resultados reales' }))

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Ver resultados reales')
  })

  it('muestra el tooltip para volver a participantes cuando está encendido', async () => {
    render(<StandingsRealtimeToggle active={true} onToggle={vi.fn()} />)

    await user.hover(screen.getByRole('button', { name: 'Ver resultados reales' }))

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Volver a la vista de participantes')
  })
})
