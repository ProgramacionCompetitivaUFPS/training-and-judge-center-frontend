import { cn } from '@/lib/utils'
import { PROCESSING_PHRASES } from '@/lib/constants'
import { RotatingStatus } from './RotatingStatus'

interface UploadProgressBarProps {
  progress: number | null
  className?: string
}

// Screen readers hear the progress in steps: announcing every progress event would be noise
const ANNOUNCE_STEP = 25

export function UploadProgressBar({ progress, className }: UploadProgressBarProps) {
  if (progress === null) return null
  const sent = progress >= 100
  const clamped = Math.min(progress, 100)
  const announced = Math.floor(clamped / ANNOUNCE_STEP) * ANNOUNCE_STEP
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-3 text-sm text-neutral-text-muted">
        <div
          role="progressbar"
          aria-label="Subiendo archivo"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          className="flex-1 h-1.5 bg-neutral-border rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-brand-primary transition-all duration-300 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
        {!sent && (
          <>
            <span aria-hidden="true" className="whitespace-nowrap tabular-nums w-28 text-right">{`Subiendo… ${progress}%`}</span>
            <span aria-live="polite" className="sr-only">{`Subida al ${announced}%`}</span>
          </>
        )}
      </div>
      {/* Fully sent: the wait that remains is the server's, with no percentage to show */}
      {sent && <RotatingStatus phrases={PROCESSING_PHRASES} />}
    </div>
  )
}
