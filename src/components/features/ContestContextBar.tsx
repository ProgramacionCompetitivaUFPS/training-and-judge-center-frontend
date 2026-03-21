import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui'
import { ContestStatusBadge } from './ContestStatusBadge'
import { ContestCountdown } from './ContestCountdown'
import type { ContestStatus } from '@/types/contest'

interface ContestContextBarProps {
  contestId: string
  contestName: string
  status: ContestStatus
  endTime?: string
  currentView: string
}

export function ContestContextBar({ contestId, contestName, status, endTime, currentView }: ContestContextBarProps) {
  const navigate = useNavigate()

  return (
    <div className="bg-neutral-surface border-b border-neutral-border">
      <div className="max-w-full mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/contests/${contestId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-neutral-text truncate">{contestName}</h2>
                <ContestStatusBadge status={status} />
              </div>
              <p className="text-xs text-neutral-text-muted">{currentView}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {status === 'ACTIVE' && endTime && (
              <ContestCountdown
                targetTime={endTime}
                label="Restante"
                className="!text-right flex items-center gap-2 [&>p:first-child]:mb-0 [&>p:first-child]:text-xs [&>p:last-child]:text-base"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
