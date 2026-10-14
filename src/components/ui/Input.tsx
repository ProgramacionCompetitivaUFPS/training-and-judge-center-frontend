import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  /** 'default' is the boxed field used across forms. 'ghost' is a borderless
   * underline field meant for inline filter/search bars sitting next to other
   * compact controls (chips, pills) rather than in a labeled form. */
  variant?: 'default' | 'ghost'
  /** Overrides the outer wrapper's width (defaults to `w-full`) — needed to
   * place multiple ghost inputs side by side instead of each claiming a full row. */
  containerClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, containerClassName, type, error, label, id, variant = 'default', ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className={cn('w-full', containerClassName)}>
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
            variant === 'default'
              ? 'flex h-10 w-full rounded-md border border-neutral-border bg-neutral-surface px-4 py-2 text-md'
              : 'flex h-9 w-full rounded-none border-0 border-b-[1.5px] border-neutral-border bg-transparent px-0.5 py-1.5 text-md',
            'placeholder:text-neutral-text-muted',
            variant === 'default'
              ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-transparent'
              : 'focus-visible:outline-none focus-visible:border-brand-primary',
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
