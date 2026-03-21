import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { SubmissionStatus } from '@/types'

interface SubmissionStatusBadgeProps {
  status: SubmissionStatus
  variant?: 'badge' | 'dot'
}

const statusConfig: Record<SubmissionStatus, { color: 'success' | 'error' | 'warning' | 'default'; label: string }> = {
  ACCEPTED: { color: 'success', label: 'Accepted' },
  WRONG_ANSWER: { color: 'error', label: 'Wrong Answer' },
  TIME_LIMIT_EXCEEDED: { color: 'warning', label: 'Time Limit' },
  MEMORY_LIMIT_EXCEEDED: { color: 'warning', label: 'Memory Limit' },
  RUNTIME_EXCEPTION: { color: 'error', label: 'Runtime Error' },
  COMPILATION_ERROR: { color: 'error', label: 'Compilation Error' },
  PRESENTATION_ERROR: { color: 'warning', label: 'Presentation Error' },
  PENDING: { color: 'default', label: 'Pending' },
  RUNNING: { color: 'default', label: 'Running' },
  SYSTEM_ERROR: { color: 'error', label: 'System Error' },
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
