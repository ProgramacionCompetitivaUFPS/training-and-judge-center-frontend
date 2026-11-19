import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
})
