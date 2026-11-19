import { readableTextColor } from '@/lib/balloon'
import { cn } from '@/lib/utils'

interface BalloonIconProps {
  /** Color ya resuelto (quien lo usa llama antes a `resolveBalloonColor`). */
  color: string
  className?: string
  /** Letra opcional dibujada dentro del globo. */
  letter?: string
}

export function BalloonIcon({ color, className, letter }: BalloonIconProps) {
  return (
    <svg data-testid="balloon-icon" aria-hidden="true" viewBox="0 0 14 18" className={cn('h-[18px] w-3.5 shrink-0', className)}>
      <path
        data-testid="balloon-icon-body"
        d="M7 .5C3.5.5 1 3.2 1 6.7 1 10.4 4.2 13.3 7 14.8c2.8-1.5 6-4.4 6-8.1C13 3.2 10.5.5 7 .5z"
        fill={color}
        stroke="#94a3b8"
        strokeWidth="0.75"
      />
      <path d="M6 14.8h2l-1 2z" fill={color} stroke="#94a3b8" strokeWidth="0.75" />
      {letter && (
        <text
          data-testid="balloon-icon-letter"
          x="7"
          y="9.2"
          textAnchor="middle"
          fontSize="6.5"
          fontWeight="700"
          fill={readableTextColor(color)}
        >
          {letter}
        </text>
      )}
    </svg>
  )
}
