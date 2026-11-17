import { cn } from '@/lib/utils'

interface UploadProgressBarProps {
  progress: number | null
  className?: string
}

export function UploadProgressBar({ progress, className }: UploadProgressBarProps) {
  if (progress === null) return null
  return (
    <div className={cn('flex items-center gap-3 text-sm text-neutral-text-muted', className)}>
      <div className="flex-1 h-1.5 bg-neutral-border rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-primary transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <span className="whitespace-nowrap tabular-nums w-28 text-right">
        {progress < 100 ? `Subiendo… ${progress}%` : 'Procesando…'}
      </span>
    </div>
  )
}
