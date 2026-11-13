import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SubmissionStatusBadge } from './SubmissionStatusBadge'
import type { SubmissionStatus } from '@/types'

const STATUS_LABELS: [SubmissionStatus, string][] = [
  ['ACCEPTED', 'Aceptado'],
  ['WRONG_ANSWER', 'Respuesta Incorrecta'],
  ['TIME_LIMIT_EXCEEDED', 'Tiempo Límite'],
  ['MEMORY_LIMIT_EXCEEDED', 'Memoria Límite'],
  ['OUTPUT_LIMIT_EXCEEDED', 'Salida Límite'],
  ['RUNTIME_ERROR', 'Error en Tiempo de Ejecución'],
  ['COMPILATION_ERROR', 'Error de Compilación'],
  ['PENDING', 'Pendiente'],
  ['RUNNING', 'Ejecutando'],
  ['SYSTEM_ERROR', 'Error del Sistema'],
]

describe('SubmissionStatusBadge', () => {
  it.each(STATUS_LABELS)('shows correct label for %s', (status, label) => {
    render(<SubmissionStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('dot variant (default) renders a colored dot', () => {
    const { container } = render(<SubmissionStatusBadge status="ACCEPTED" />)
    // dot is a rounded-full span
    const dot = container.querySelector('.rounded-full')
    expect(dot).toBeInTheDocument()
  })

  it('badge variant renders a Badge element (no dot)', () => {
    const { container } = render(<SubmissionStatusBadge status="ACCEPTED" variant="badge" />)
    expect(screen.getByText('Aceptado')).toBeInTheDocument()
    expect(container.querySelector('.rounded-full')).not.toBeInTheDocument()
  })
})
