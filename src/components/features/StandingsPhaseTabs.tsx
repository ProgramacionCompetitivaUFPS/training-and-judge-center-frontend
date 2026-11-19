import { cn } from '@/lib/utils'
import type { StandingsPhase } from '@/types/contest'

const PHASE_OPTIONS: { value: StandingsPhase; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'competition', label: 'Competencia' },
  { value: 'postcompetition', label: 'Post-competencia' },
]

interface StandingsPhaseTabsProps {
  value: StandingsPhase
  onChange: (phase: StandingsPhase) => void
}

export function StandingsPhaseTabs({ value, onChange }: StandingsPhaseTabsProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Fase"
      className="inline-flex rounded-pill border border-neutral-border bg-neutral-surface p-0.5"
    >
      {PHASE_OPTIONS.map((option) => {
        const checked = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-pill px-3 py-1 text-sm font-semibold transition-colors',
              checked
                ? 'bg-brand-primary-muted text-brand-primary'
                : 'text-neutral-text-muted hover:text-neutral-text-primary',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
