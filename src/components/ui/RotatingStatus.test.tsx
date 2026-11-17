import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { RotatingStatus } from './RotatingStatus'

// Each tick() is its own act(): the hold and dot timers are scheduled after the render that
// finishes typing, so a single big advance would skip over them.
function tick(ms: number) {
  act(() => { vi.advanceTimersByTime(ms) })
}

const timing = { typeMs: 10, holdMs: 100, dotMs: 50 }

describe('RotatingStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('escribe la frase letra por letra, sin los puntos finales', () => {
    render(<RotatingStatus phrases={['Uno…', 'Dos…']} {...timing} />)
    expect(screen.queryByText('U')).not.toBeInTheDocument()

    tick(10)
    expect(screen.getByText('U')).toBeInTheDocument()
    tick(10)
    expect(screen.getByText('Un')).toBeInTheDocument()
    tick(10)
    expect(screen.getByText('Uno')).toBeInTheDocument()
  })

  it('al terminar de escribir anima los tres puntos finales', () => {
    render(<RotatingStatus phrases={['Uno…', 'Dos…']} {...timing} holdMs={10_000} />)
    tick(30)
    const dots = screen.getByTestId('rotating-status-dots')
    expect(dots).toHaveTextContent('')

    tick(50)
    expect(dots).toHaveTextContent(/^\.$/)
    tick(50)
    expect(dots).toHaveTextContent(/^\.\.$/)
    tick(50)
    expect(dots).toHaveTextContent(/^\.\.\.$/)
    tick(50)
    expect(dots).toHaveTextContent(/^\.$/)
  })

  it('pasa a la siguiente frase cuando la anterior se quedó el tiempo de espera', () => {
    render(<RotatingStatus phrases={['Uno…', 'Dos…']} {...timing} />)
    tick(30)
    expect(screen.getByText('Uno')).toBeInTheDocument()

    tick(100)
    expect(screen.queryByText('Uno')).not.toBeInTheDocument()
    tick(30)

    expect(screen.getByText('Dos')).toBeInTheDocument()
  })

  it('vuelve a la primera frase después de recorrer todas', () => {
    render(<RotatingStatus phrases={['Uno…', 'Dos…']} {...timing} />)
    tick(30); tick(100); tick(30); tick(100); tick(30)

    expect(screen.getByText('Uno')).toBeInTheDocument()
    expect(screen.queryByText('Dos')).not.toBeInTheDocument()
  })

  it('con una sola frase la escribe una vez y no cambia', () => {
    render(<RotatingStatus phrases={['Solo…']} {...timing} />)
    tick(50)
    tick(5_000)

    expect(screen.getByText('Solo')).toBeInTheDocument()
  })

  it('con movimiento reducido muestra la frase completa de una vez, sin teclear ni animar los puntos', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    render(<RotatingStatus phrases={['Uno…', 'Dos…']} {...timing} />)

    expect(screen.getByText('Uno')).toBeInTheDocument()
    expect(screen.getByTestId('rotating-status-dots')).toHaveTextContent('...')
  })

  it('anuncia a los lectores de pantalla una sola frase estable, no cada cambio', () => {
    render(<RotatingStatus phrases={['Uno…', 'Dos…']} {...timing} />)
    tick(30); tick(100); tick(30)

    expect(screen.getByText('Dos')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Uno…')
  })

  it('detiene los temporizadores al desmontar', () => {
    const { unmount } = render(<RotatingStatus phrases={['Uno…', 'Dos…']} {...timing} />)
    tick(30)

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
