import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-text-primary mb-2"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-neutral-border bg-neutral-surface px-4 py-2 text-md',
            'placeholder:text-neutral-text-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-status-error focus-visible:ring-status-error',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-status-error">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
