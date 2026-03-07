import * as React from 'react'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-neutral-background border-neutral-border text-neutral-text-primary',
      success: 'bg-status-success/10 border-status-success text-status-success',
      warning: 'bg-brand-accent-muted border-brand-accent text-brand-accent',
      error: 'bg-status-error/10 border-status-error text-status-error',
      info: 'bg-brand-primary-muted border-brand-primary text-brand-primary',
    }

    const icons = {
      default: Info,
      success: CheckCircle,
      warning: AlertCircle,
      error: XCircle,
      info: Info,
    }

    const Icon = icons[variant]

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-md border p-4 flex items-start gap-3',
          variants[variant],
          className
        )}
        {...props}
      >
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">{children}</div>
      </div>
    )
  }
)
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
