import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { StandingsPhase } from '@/types/contest'
import { StandingsPhaseTabs } from './StandingsPhaseTabs'

describe('StandingsPhaseTabs', () => {
  it('muestra las tres fases en orden como radios dentro de un grupo llamado Fase', () => {
    render(<StandingsPhaseTabs value="all" onChange={vi.fn()} />)

    const radios = screen.getAllByRole('radio')

    expect(screen.getByRole('radiogroup', { name: 'Fase' })).toBeInTheDocument()
    expect(radios.map((r) => r.textContent)).toEqual(['Todas', 'Competencia', 'Post-competencia'])
  })

  it('marca como activa solo la fase recibida en value', () => {
    render(<StandingsPhaseTabs value="competition" onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: 'Competencia' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Todas' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: 'Post-competencia' })).toHaveAttribute('aria-checked', 'false')
  })

  it('llama a onChange una vez con postcompetition al pulsar Post-competencia', async () => {
    // Arrange
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StandingsPhaseTabs value="all" onChange={onChange} />)

    // Act
    await user.click(screen.getByRole('radio', { name: 'Post-competencia' }))

    // Assert
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('postcompetition')
  })

  it('llama a onChange con all al pulsar Todas', async () => {
    // Arrange
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StandingsPhaseTabs value="competition" onChange={onChange} />)

    // Act
    await user.click(screen.getByRole('radio', { name: 'Todas' }))

    // Assert
    expect(onChange).toHaveBeenCalledWith('all')
  })

  it('deja en la secuencia de Tab solo la opción activa', async () => {
    // Arrange
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Antes</button>
        <StandingsPhaseTabs value="competition" onChange={vi.fn()} />
        <button type="button">Después</button>
      </>,
    )

    // Act / Assert
    await user.tab()
    expect(screen.getByRole('button', { name: 'Antes' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Competencia' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Después' })).toHaveFocus()
  })

  it.each<[string, StandingsPhase, StandingsPhase, string]>([
    ['{ArrowRight}', 'all', 'competition', 'Competencia'],
    ['{ArrowDown}', 'all', 'competition', 'Competencia'],
    ['{ArrowLeft}', 'competition', 'all', 'Todas'],
    ['{ArrowUp}', 'competition', 'all', 'Todas'],
    ['{ArrowRight}', 'postcompetition', 'all', 'Todas'],
    ['{ArrowLeft}', 'all', 'postcompetition', 'Post-competencia'],
  ])('con %s desde %s selecciona %s y le pasa el foco', async (key, start, expected, expectedLabel) => {
    // Arrange
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StandingsPhaseTabs value={start} onChange={onChange} />)
    await user.tab()

    // Act
    await user.keyboard(key)

    // Assert
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(expected)
    expect(screen.getByRole('radio', { name: expectedLabel })).toHaveFocus()
  })

  it('ignora las teclas que no son flechas', async () => {
    // Arrange
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StandingsPhaseTabs value="all" onChange={onChange} />)
    await user.tab()

    // Act
    await user.keyboard('a')

    // Assert
    expect(onChange).not.toHaveBeenCalled()
  })
})
