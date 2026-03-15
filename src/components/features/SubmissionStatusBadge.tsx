import { Badge } from '@/components/ui'
import { SubmissionStatus } from '@/types'

interface SubmissionStatusBadgeProps {
  status: SubmissionStatus
}

const statusConfig: Record<SubmissionStatus, { variant: 'success' | 'error' | 'warning' | 'default'; label: string }> = {
  ACCEPTED: { variant: 'success', label: 'Accepted' },
  WRONG_ANSWER: { variant: 'error', label: 'Wrong Answer' },
  TIME_LIMIT_EXCEEDED: { variant: 'warning', label: 'Time Limit' },
  MEMORY_LIMIT_EXCEEDED: { variant: 'warning', label: 'Memory Limit' },
  RUNTIME_EXCEPTION: { variant: 'error', label: 'Runtime Error' },
  COMPILATION_ERROR: { variant: 'error', label: 'Compilation Error' },
  PRESENTATION_ERROR: { variant: 'warning', label: 'Presentation Error' },
  PENDING: { variant: 'default', label: 'Pending' },
  RUNNING: { variant: 'default', label: 'Running' },
  SYSTEM_ERROR: { variant: 'error', label: 'System Error' },
}

export function SubmissionStatusBadge({ status }: SubmissionStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}
