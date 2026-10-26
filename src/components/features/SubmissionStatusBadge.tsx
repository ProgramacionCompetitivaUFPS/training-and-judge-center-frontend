import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { SubmissionStatus } from '@/types'

interface SubmissionStatusBadgeProps {
  status: SubmissionStatus
  variant?: 'badge' | 'dot'
}

const statusConfig: Record<SubmissionStatus, { color: 'success' | 'error' | 'warning' | 'default'; label: string }> = {
  ACCEPTED: { color: 'success', label: 'Aceptado' },
  WRONG_ANSWER: { color: 'error', label: 'Respuesta Incorrecta' },
  TIME_LIMIT_EXCEEDED: { color: 'warning', label: 'Tiempo Límite' },
  MEMORY_LIMIT_EXCEEDED: { color: 'warning', label: 'Memoria Límite' },
  OUTPUT_LIMIT_EXCEEDED: { color: 'warning', label: 'Salida Límite' },
  RUNTIME_ERROR: { color: 'error', label: 'Error en Tiempo de Ejecución' },
  COMPILATION_ERROR: { color: 'error', label: 'Error de Compilación' },
  PENDING: { color: 'default', label: 'Pendiente' },
  RUNNING: { color: 'default', label: 'Ejecutando' },
  SYSTEM_ERROR: { color: 'error', label: 'Error del Sistema' },
}

const dotColors: Record<string, string> = {
  success: 'bg-status-success',
  error: 'bg-status-error',
  warning: 'bg-status-warning',
  default: 'bg-neutral-text-muted',
}

const textColors: Record<string, string> = {
  success: 'text-status-success',
  error: 'text-status-error',
  warning: 'text-status-warning',
  default: 'text-neutral-text-muted',
}

export function SubmissionStatusBadge({ status, variant = 'dot' }: SubmissionStatusBadgeProps) {
  const config = statusConfig[status]

  if (variant === 'badge') {
    return <Badge variant={config.color}>{config.label}</Badge>
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-full shrink-0', dotColors[config.color])} />
      <span className={cn('text-sm font-medium', textColors[config.color])}>
        {config.label}
      </span>
    </span>
  )
}
