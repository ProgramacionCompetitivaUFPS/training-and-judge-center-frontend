import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ContestCountdown } from './ContestCountdown'

afterEach(() => {
  vi.useRealTimers()
})

describe('ContestCountdown', () => {
  it('shows 00:00:00 when targetTime is in the past', () => {
    const past = new Date(Date.now() - 10_000).toISOString()
    render(<ContestCountdown targetTime={past} />)
    expect(screen.getByText('00:00:00')).toBeInTheDocument()
  })

  it('formats a future time as HH:MM:SS', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))
    render(<ContestCountdown targetTime="2026-06-01T12:01:30Z" />)
    // 90 seconds → 00:01:30
    expect(screen.getByText('00:01:30')).toBeInTheDocument()
  })

  it('includes days in format when more than 24h remain', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
    render(<ContestCountdown targetTime="2026-06-03T00:00:00Z" />)
    // 2 days exactly → "2d 00:00:00"
    expect(screen.getByText('2d 00:00:00')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    const past = new Date(Date.now() - 1000).toISOString()
    render(<ContestCountdown targetTime={past} label="Tiempo restante" />)
    expect(screen.getByText('Tiempo restante')).toBeInTheDocument()
  })

  it('calls onComplete when countdown reaches zero', () => {
    vi.useFakeTimers()
    // Set time 500ms before target
    vi.setSystemTime(new Date('2026-06-01T11:59:59.500Z'))
    const onComplete = vi.fn()
    render(<ContestCountdown targetTime="2026-06-01T12:00:00Z" onComplete={onComplete} />)
    // setInterval fires every 1000ms — advance past that so the first tick fires
    act(() => vi.advanceTimersByTime(1100))
    expect(onComplete).toHaveBeenCalledOnce()
  })
})
