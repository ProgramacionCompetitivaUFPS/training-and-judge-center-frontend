import { cn } from '@/lib/utils'
import { PROCESSING_PHRASES } from '@/lib/constants'
import { RotatingStatus } from './RotatingStatus'

interface UploadProgressBarProps {
  progress: number | null
  className?: string
}

export function UploadProgressBar({ progress, className }: UploadProgressBarProps) {
  if (progress === null) return null
  const sent = progress >= 100
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-3 text-sm text-neutral-text-muted">
        <div className="flex-1 h-1.5 bg-neutral-border rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-primary transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        {!sent && (
          <span className="whitespace-nowrap tabular-nums w-28 text-right">{`Subiendo… ${progress}%`}</span>
        )}
      </div>
      {/* Fully sent: the wait that remains is the server's, with no percentage to show */}
      {sent && <RotatingStatus phrases={PROCESSING_PHRASES} />}
    </div>
  )
}
