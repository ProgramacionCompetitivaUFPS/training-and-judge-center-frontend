import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { BalloonIcon } from './BalloonIcon'

describe('BalloonIcon', () => {
  it.each(['#2563eb', '#e11d48'])('pinta el globo con el color recibido %s', (color) => {
    render(<BalloonIcon color={color} />)

    expect(screen.getByTestId('balloon-icon-body')).toHaveAttribute('fill', color)
  })

  it('dibuja un borde para que el globo blanco se vea sobre fondo blanco', () => {
    render(<BalloonIcon color="#ffffff" />)

    expect(screen.getByTestId('balloon-icon-body')).toHaveAttribute('stroke', '#94a3b8')
  })

  it('aplica la clase recibida al svg', () => {
    render(<BalloonIcon color="#ffffff" className="h-8" />)

    expect(screen.getByTestId('balloon-icon')).toHaveClass('h-8')
  })
})
