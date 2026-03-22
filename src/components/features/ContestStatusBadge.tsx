import { Badge } from '@/components/ui'
import { CONTEST_STATUS_CONFIG } from '@/lib/constants'
import type { ContestStatus } from '@/types/contest'

interface ContestStatusBadgeProps {
  status: ContestStatus
}

export function ContestStatusBadge({ status }: ContestStatusBadgeProps) {
  const config = CONTEST_STATUS_CONFIG[status]
  return (
    <Badge variant={config.color as 'default' | 'success' | 'outline'}>
      {config.label}
    </Badge>
  )
}
