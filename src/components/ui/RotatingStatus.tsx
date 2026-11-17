import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface RotatingStatusProps {
  /** The first phrase should be the plain, informative one: it is also what screen readers get. */
  phrases: readonly string[]
  intervalMs?: number
  className?: string
}

/** A status line that cycles through phrases with a blinking caret, for waits of unknown length. */
export function RotatingStatus({ phrases, intervalMs = 2500, className }: RotatingStatusProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (phrases.length < 2) return
    const id = setInterval(() => setIndex((current) => (current + 1) % phrases.length), intervalMs)
    return () => clearInterval(id)
  }, [phrases.length, intervalMs])

  return (
    <div role="status" className={cn('flex items-center gap-1.5 text-sm text-neutral-text-muted', className)}>
      {/* Stable for assistive tech: announcing every phrase change would be noise */}
      <span className="sr-only">{phrases[0]}</span>
      <span key={index} aria-hidden="true" className="animate-fade-in-up motion-reduce:animate-none">
        {phrases[index]}
      </span>
      <span
        aria-hidden="true"
        className="inline-block h-4 w-1.5 rounded-sm bg-brand-primary animate-caret-blink motion-reduce:animate-none"
      />
    </div>
  )
}
