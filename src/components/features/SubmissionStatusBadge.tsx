import { Badge } from '@/components/ui'
import { SubmissionStatus } from '@/types'

interface SubmissionStatusBadgeProps {
  status: SubmissionStatus
}

export function SubmissionStatusBadge({ status }: SubmissionStatusBadgeProps) {
  const statusConfig: Record<SubmissionStatus, { variant: 'success' | 'error' | 'warning' | 'default'; label: string }> = {
    AC: { variant: 'success', label: 'Accepted' },
    WA: { variant: 'error', label: 'Wrong Answer' },
    TLE: { variant: 'warning', label: 'Time Limit' },
    MLE: { variant: 'warning', label: 'Memory Limit' },
    RE: { variant: 'error', label: 'Runtime Error' },
    CE: { variant: 'error', label: 'Compilation Error' },
    PE: { variant: 'warning', label: 'Presentation Error' },
    PENDING: { variant: 'default', label: 'Pending' },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}
