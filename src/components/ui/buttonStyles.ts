import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary text-neutral-surface hover:bg-brand-primary-dark focus-visible:ring-brand-primary',
  secondary: 'bg-neutral-border text-neutral-text-primary hover:bg-neutral-border/80',
  outline: 'border-2 border-brand-primary text-brand-primary hover:bg-brand-primary-muted',
  ghost: 'text-neutral-text-primary hover:bg-neutral-background',
  danger: 'bg-status-error text-neutral-surface hover:bg-status-error/90',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-sm',
  md: 'h-10 px-4 text-md rounded-md',
  lg: 'h-12 px-6 text-lg rounded-md',
}

/** The look of a Button, for things that are not a <button> (a link that navigates, for instance). */
export function buttonClasses({ variant = 'primary', size = 'md', className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(baseStyles, variants[variant], sizes[size], className)
}
