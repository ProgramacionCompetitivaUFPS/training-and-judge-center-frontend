import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Submit</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Submit</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is disabled when isLoading', () => {
    render(<Button isLoading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows spinner svg when isLoading', () => {
    const { container } = render(<Button isLoading>Submit</Button>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('does not show spinner when not loading', () => {
    const { container } = render(<Button>Submit</Button>)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })
})
