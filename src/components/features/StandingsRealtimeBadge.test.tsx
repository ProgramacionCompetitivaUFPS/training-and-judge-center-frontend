import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StandingsRealtimeBadge } from './StandingsRealtimeBadge'

describe('StandingsRealtimeBadge', () => {
  it('muestra la marca Resultados reales', () => {
    render(<StandingsRealtimeBadge />)

    expect(screen.getByText('Resultados reales')).toBeInTheDocument()
  })
})
