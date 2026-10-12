import { Blend, UserRound, UsersRound } from 'lucide-react'
import { cn, participationModeLabel } from '@/lib/utils'
import type { ParticipationMode } from '@/types/contest'

const ICONS = {
  INDIVIDUAL: UserRound,
  TEAM: UsersRound,
  MIXED: Blend,
} as const

interface ParticipationModeTagProps {
  mode: ParticipationMode
  className?: string
}

export function ParticipationModeTag({ mode, className }: ParticipationModeTagProps) {
  const Icon = ICONS[mode]
  if (!Icon) return null
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-neutral-text-muted', className)}>
      <Icon className="h-3.5 w-3.5" />
      {participationModeLabel(mode)}
    </span>
  )
}
