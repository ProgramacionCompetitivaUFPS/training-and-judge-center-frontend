import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { UploadProgressBar } from './UploadProgressBar'
import { PROCESSING_PHRASES } from '@/lib/constants'

describe('UploadProgressBar', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('no renderiza nada cuando progress es null', () => {
    const { container } = render(<UploadProgressBar progress={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('muestra el porcentaje mientras sube', () => {
    render(<UploadProgressBar progress={42} />)
    expect(screen.getByText('Subiendo… 42%')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('muestra "Procesando…" como estado cuando el progreso llega a 100', () => {
    render(<UploadProgressBar progress={100} />)
    expect(screen.getByRole('status')).toHaveTextContent('Procesando…')
    expect(screen.queryByText(/subiendo…/i)).not.toBeInTheDocument()
  })

  it('al llegar a 100 va cambiando de frase mientras el servidor procesa', () => {
    vi.useFakeTimers()
    const secondPhrase = PROCESSING_PHRASES[1].replace(/…$/, '')
    render(<UploadProgressBar progress={100} />)
    expect(screen.queryByText(secondPhrase)).not.toBeInTheDocument()

    // Separate acts: each stage schedules the timer of the next one (type, hold, type again)
    act(() => { vi.advanceTimersByTime(1000) })
    act(() => { vi.advanceTimersByTime(1000) })
    act(() => { vi.advanceTimersByTime(1000) })

    expect(screen.getByText(secondPhrase)).toBeInTheDocument()
  })

  it('la barra interior refleja el ancho del porcentaje', () => {
    const { container } = render(<UploadProgressBar progress={60} />)
    const bar = container.querySelector('[style]') as HTMLElement
    expect(bar?.style.width).toBe('60%')
  })

  it('limita el ancho al 100% si progress supera 100', () => {
    const { container } = render(<UploadProgressBar progress={120} />)
    const bar = container.querySelector('[style]') as HTMLElement
    expect(bar?.style.width).toBe('100%')
  })
})
