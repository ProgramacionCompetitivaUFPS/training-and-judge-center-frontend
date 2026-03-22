import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ContestCountdownProps {
  targetTime: string
  label?: string
  className?: string
  variant?: 'default' | 'hero' | 'competition'
  /** Required for 'competition' variant to calculate progress bar */
  startTime?: string
  onComplete?: () => void
}

function useTimeLeft(targetTime: string, onComplete?: () => void) {
  const [timeLeft, setTimeLeft] = useState(() => new Date(targetTime).getTime() - Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = new Date(targetTime).getTime() - Date.now()
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        onComplete?.()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [targetTime, onComplete])

  return timeLeft
}

function parseTimeLeft(ms: number) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds }
}

function formatTimeLeft(ms: number): string {
  const { days, hours, minutes, seconds } = parseTimeLeft(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  if (days > 0) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function TimeUnit({ value, label, light }: { value: number; label: string; light?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={cn(
        'font-extrabold font-mono tabular-nums',
        light
          ? 'text-3xl md:text-4xl text-white'
          : 'text-4xl md:text-5xl text-brand-primary',
      )}>
        {String(value).padStart(2, '0')}
      </span>
      <span className={cn(
        'text-[10px] font-bold uppercase tracking-widest mt-1',
        light ? 'text-white/60' : 'text-neutral-text-muted',
      )}>
        {label}
      </span>
    </div>
  )
}

function TimeSeparator() {
  return (
    <span className="text-3xl md:text-4xl font-light text-neutral-border self-start mt-1">:</span>
  )
}

export function ContestCountdown({ targetTime, label, className, variant = 'default', startTime, onComplete }: ContestCountdownProps) {
  const timeLeft = useTimeLeft(targetTime, onComplete)

  if (variant === 'competition') {
    const { days, hours, minutes, seconds } = parseTimeLeft(timeLeft)
    const progress = startTime
      ? Math.max(0, Math.min(1, (Date.now() - new Date(startTime).getTime()) / (new Date(targetTime).getTime() - new Date(startTime).getTime())))
      : 0
    return (
      <div className={cn('text-center', className)}>
        {label && (
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-white/80">{label}</p>
        )}
        <div className="flex items-center justify-center gap-2 md:gap-3">
          {days > 0 && (
            <>
              <TimeUnit value={days} label={days === 1 ? 'día' : 'días'} light />
              <span className="text-2xl md:text-3xl font-light text-white/40 self-start mt-0.5">:</span>
            </>
          )}
          <TimeUnit value={hours} label="horas" light />
          <span className="text-2xl md:text-3xl font-light text-white/40 self-start mt-0.5">:</span>
          <TimeUnit value={minutes} label="min" light />
          <span className="text-2xl md:text-3xl font-light text-white/40 self-start mt-0.5">:</span>
          <TimeUnit value={seconds} label="seg" light />
        </div>
        <div className="mt-3 w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-white h-full rounded-full transition-all duration-1000"
            style={{ width: `${(1 - progress) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  if (variant === 'hero') {
    const { days, hours, minutes, seconds } = parseTimeLeft(timeLeft)
    return (
      <div className={cn('text-center', className)}>
        {label && (
          <p className="text-sm font-semibold text-neutral-text-muted uppercase tracking-widest mb-4">{label}</p>
        )}
        <div className="flex items-center justify-center gap-3 md:gap-5">
          {days > 0 && (
            <>
              <TimeUnit value={days} label={days === 1 ? 'día' : 'días'} />
              <TimeSeparator />
            </>
          )}
          <TimeUnit value={hours} label="horas" />
          <TimeSeparator />
          <TimeUnit value={minutes} label="min" />
          <TimeSeparator />
          <TimeUnit value={seconds} label="seg" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('text-center', className)}>
      {label && <p className="text-sm text-neutral-text-muted mb-1">{label}</p>}
      <p className="font-mono text-2xl font-bold text-brand-primary">
        {formatTimeLeft(timeLeft)}
      </p>
    </div>
  )
}
