import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { RotatingStatus } from './RotatingStatus'

describe('RotatingStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('muestra la primera frase al montar y todavía no las siguientes', () => {
    render(<RotatingStatus phrases={['Uno…', 'Dos…', 'Tres…']} />)

    expect(screen.getByRole('status')).toHaveTextContent('Uno…')
    expect(screen.queryByText('Dos…')).not.toBeInTheDocument()
  })

  it('cambia a la siguiente frase cuando pasa el intervalo', () => {
    render(<RotatingStatus phrases={['Uno…', 'Dos…', 'Tres…']} intervalMs={1000} />)

    act(() => { vi.advanceTimersByTime(1000) })

    expect(screen.getByText('Dos…')).toBeInTheDocument()
  })

  it('vuelve a la primera frase después de recorrer todas', () => {
    render(<RotatingStatus phrases={['Uno…', 'Dos…']} intervalMs={1000} />)

    act(() => { vi.advanceTimersByTime(2000) })

    expect(screen.getByRole('status')).toHaveTextContent('Uno…')
    expect(screen.queryByText('Dos…')).not.toBeInTheDocument()
  })

  it('con una sola frase no cambia ni programa un intervalo', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    render(<RotatingStatus phrases={['Solo…']} intervalMs={1000} />)

    act(() => { vi.advanceTimersByTime(5000) })

    expect(screen.getByRole('status')).toHaveTextContent('Solo…')
    expect(setIntervalSpy).not.toHaveBeenCalled()
  })

  it('detiene el intervalo al desmontar', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = render(<RotatingStatus phrases={['Uno…', 'Dos…']} intervalMs={1000} />)

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('anuncia a los lectores de pantalla una sola frase estable, no cada cambio', () => {
    render(<RotatingStatus phrases={['Uno…', 'Dos…']} intervalMs={1000} />)

    act(() => { vi.advanceTimersByTime(1000) })

    expect(screen.getByText('Dos…')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Uno…')
  })
})
