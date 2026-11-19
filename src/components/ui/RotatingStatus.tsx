import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface RotatingStatusProps {
  /** The first phrase should be the plain, informative one: it is also what screen readers get. */
  phrases: readonly string[]
  /** Delay between typed letters. */
  typeMs?: number
  /** How long a finished phrase stays before the next one starts typing. */
  holdMs?: number
  /** Speed of the animated trailing dots. */
  dotMs?: number
  className?: string
}

const MAX_DOTS = 3
// Without motion there is no typing to wait for, so the phrase needs a bit longer to be read
const REDUCED_MOTION_HOLD_MS = 2500

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * A status line for waits of unknown length: each phrase is typed letter by letter, its trailing
 * dots animate while it stays, and then the next phrase takes over.
 */
export function RotatingStatus({ phrases, typeMs = 20, holdMs = 900, dotMs = 300, className }: RotatingStatusProps) {
  const [index, setIndex] = useState(0)
  const next = useCallback(() => setIndex((current) => (current + 1) % phrases.length), [phrases.length])

  return (
    <div role="status" className={cn('text-sm text-neutral-text-muted', className)}>
      {/* Stable for assistive tech: announcing every phrase change would be noise */}
      <span className="sr-only">{phrases[0]}</span>
      <TypedPhrase
        key={index}
        phrase={phrases[index]}
        typeMs={typeMs}
        holdMs={holdMs}
        dotMs={dotMs}
        onDone={phrases.length > 1 ? next : undefined}
      />
    </div>
  )
}

interface TypedPhraseProps {
  phrase: string
  typeMs: number
  holdMs: number
  dotMs: number
  onDone?: () => void
}

// Remounted (keyed) for every phrase, so each one starts typing from zero
function TypedPhrase({ phrase, typeMs, holdMs, dotMs, onDone }: TypedPhraseProps) {
  const text = phrase.replace(/…$/, '')
  const reduced = prefersReducedMotion()
  const [typed, setTyped] = useState(reduced ? text.length : 0)
  const [dots, setDots] = useState(reduced ? MAX_DOTS : 0)
  const finished = typed >= text.length

  useEffect(() => {
    if (finished) return
    const id = setInterval(() => setTyped((count) => count + 1), typeMs)
    return () => clearInterval(id)
  }, [finished, typeMs])

  useEffect(() => {
    if (!finished || reduced) return
    const id = setInterval(() => setDots((count) => (count % MAX_DOTS) + 1), dotMs)
    return () => clearInterval(id)
  }, [finished, reduced, dotMs])

  useEffect(() => {
    if (!finished || !onDone) return
    const id = setTimeout(onDone, reduced ? REDUCED_MOTION_HOLD_MS : holdMs)
    return () => clearTimeout(id)
  }, [finished, onDone, holdMs, reduced])

  return (
    <span aria-hidden="true">
      {text.slice(0, typed)}
      {/* Fixed width: the line must not jitter while the dots come and go */}
      <span data-testid="rotating-status-dots" className="inline-block w-[3ch] text-left">
        {'.'.repeat(dots)}
      </span>
    </span>
  )
}
