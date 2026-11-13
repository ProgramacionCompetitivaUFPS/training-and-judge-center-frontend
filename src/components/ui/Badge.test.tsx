import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>ACCEPTED</Badge>)
    expect(screen.getByText('ACCEPTED')).toBeInTheDocument()
  })

  it('renders without crashing with default variant', () => {
    const { container } = render(<Badge>label</Badge>)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies extra className', () => {
    const { container } = render(<Badge className="custom-class">label</Badge>)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it.each(['default', 'primary', 'success', 'warning', 'error', 'outline'] as const)(
    'renders %s variant without crashing',
    (variant) => {
      render(<Badge variant={variant}>text</Badge>)
      expect(screen.getByText('text')).toBeInTheDocument()
    },
  )
})
