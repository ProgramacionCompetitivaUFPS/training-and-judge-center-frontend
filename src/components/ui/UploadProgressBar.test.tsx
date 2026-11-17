import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UploadProgressBar } from './UploadProgressBar'

describe('UploadProgressBar', () => {
  it('no renderiza nada cuando progress es null', () => {
    const { container } = render(<UploadProgressBar progress={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('muestra el porcentaje mientras sube', () => {
    render(<UploadProgressBar progress={42} />)
    expect(screen.getByText('Subiendo… 42%')).toBeInTheDocument()
  })

  it('muestra "Procesando…" cuando el progreso llega a 100', () => {
    render(<UploadProgressBar progress={100} />)
    expect(screen.getByText('Procesando…')).toBeInTheDocument()
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
