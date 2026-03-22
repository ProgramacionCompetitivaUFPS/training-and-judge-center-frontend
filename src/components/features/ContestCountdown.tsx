import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ContestCountdownProps {
  targetTime: string
  label?: string
  className?: string
  onComplete?: () => void
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}d ${pad(remainingHours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function ContestCountdown({ targetTime, label, className, onComplete }: ContestCountdownProps) {
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

  return (
    <div className={cn('text-center', className)}>
      {label && <p className="text-sm text-neutral-text-muted mb-1">{label}</p>}
      <p className="font-mono text-2xl font-bold text-brand-primary">
        {formatTimeLeft(timeLeft)}
      </p>
    </div>
  )
}
