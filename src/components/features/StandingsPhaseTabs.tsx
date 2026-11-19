import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import type { StandingsPhase } from '@/types/contest'

const PHASE_OPTIONS: { value: StandingsPhase; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'competition', label: 'Competencia' },
  { value: 'postcompetition', label: 'Post-competencia' },
]

// Patrón de radios (WAI-ARIA): las flechas mueven la selección y el foco, con vuelta al otro extremo.
const ARROW_STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
}

interface StandingsPhaseTabsProps {
  value: StandingsPhase
  onChange: (phase: StandingsPhase) => void
}

export function StandingsPhaseTabs({ value, onChange }: StandingsPhaseTabsProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = ARROW_STEPS[event.key]
    if (step === undefined) return

    event.preventDefault()
    const current = buttonRefs.current.findIndex((button) => button === document.activeElement)
    const from = current === -1 ? PHASE_OPTIONS.findIndex((option) => option.value === value) : current
    const next = (from + step + PHASE_OPTIONS.length) % PHASE_OPTIONS.length

    onChange(PHASE_OPTIONS[next].value)
    buttonRefs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Fase"
      onKeyDown={handleKeyDown}
      className="inline-flex rounded-pill border border-neutral-border bg-neutral-surface p-0.5"
    >
      {PHASE_OPTIONS.map((option, index) => {
        const checked = value === option.value
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttonRefs.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
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
