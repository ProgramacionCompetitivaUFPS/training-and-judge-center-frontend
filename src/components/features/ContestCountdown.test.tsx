import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ContestCountdown } from './ContestCountdown'

// Pure-function helpers — exported only for testing via module internals
// We test them by importing the component and exercising boundary inputs.

describe('ContestCountdown — default variant', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders formatted time when target is in the future', () => {
    const target = new Date(Date.now() + 2 * 3600 * 1000 + 5 * 60 * 1000 + 30 * 1000).toISOString()
    render(<ContestCountdown targetTime={target} />)
    expect(screen.getByText('02:05:30')).toBeInTheDocument()
  })

  it('shows 00:00:00 when target is in the past', () => {
    const past = new Date(Date.now() - 1000).toISOString()
    render(<ContestCountdown targetTime={past} />)
    expect(screen.getByText('00:00:00')).toBeInTheDocument()
  })

  it('renders optional label', () => {
    const target = new Date(Date.now() + 60000).toISOString()
    render(<ContestCountdown targetTime={target} label="Comienza en" />)
    expect(screen.getByText('Comienza en')).toBeInTheDocument()
  })

  it('counts down each second', () => {
    const target = new Date(Date.now() + 3000).toISOString()
    render(<ContestCountdown targetTime={target} />)
    expect(screen.getByText('00:00:03')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('00:00:02')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('00:00:01')).toBeInTheDocument()
  })

  it('calls onComplete when countdown reaches zero', () => {
    const onComplete = vi.fn()
    const target = new Date(Date.now() + 1000).toISOString()
    render(<ContestCountdown targetTime={target} onComplete={onComplete} />)

    act(() => vi.advanceTimersByTime(1500))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})

describe('ContestCountdown — hero variant', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders days when target is more than 24h away', () => {
    const target = new Date(Date.now() + 2 * 86400 * 1000).toISOString()
    render(<ContestCountdown targetTime={target} variant="hero" />)
    // "días" label should appear (2 days)
    expect(screen.getByText('días')).toBeInTheDocument()
  })

  it('does not render days unit when target is less than 24h away', () => {
    const target = new Date(Date.now() + 3600 * 1000).toISOString()
    render(<ContestCountdown targetTime={target} variant="hero" />)
    expect(screen.queryByText(/día/)).not.toBeInTheDocument()
    expect(screen.getByText('horas')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    const target = new Date(Date.now() + 3600 * 1000).toISOString()
    render(<ContestCountdown targetTime={target} variant="hero" label="Termina en" />)
    expect(screen.getByText('Termina en')).toBeInTheDocument()
  })
})

describe('ContestCountdown — competition variant', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders without crashing when startTime is provided', () => {
    const start = new Date(Date.now() - 30 * 60 * 1000).toISOString() // started 30 min ago
    const end = new Date(Date.now() + 30 * 60 * 1000).toISOString()   // ends in 30 min
    render(<ContestCountdown targetTime={end} variant="competition" startTime={start} label="Tiempo restante" />)
    expect(screen.getByText('Tiempo restante')).toBeInTheDocument()
    expect(screen.getByText('min')).toBeInTheDocument()
  })

  it('renders without crashing when startTime is omitted', () => {
    const end = new Date(Date.now() + 3600 * 1000).toISOString()
    render(<ContestCountdown targetTime={end} variant="competition" />)
    expect(screen.getByText('horas')).toBeInTheDocument()
  })
})
