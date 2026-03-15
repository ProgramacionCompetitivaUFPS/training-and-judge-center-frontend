import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-neutral-border text-neutral-text-primary',
    primary: 'bg-brand-primary-muted text-brand-primary',
    success: 'bg-status-success/10 text-status-success',
    warning: 'bg-brand-accent-muted text-brand-accent',
    error: 'bg-status-error/10 text-status-error',
    outline: 'border border-neutral-border text-neutral-text-primary',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
