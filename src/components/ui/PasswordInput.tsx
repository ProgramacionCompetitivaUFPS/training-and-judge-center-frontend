import * as React from 'react'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPasswordStrength } from '@/lib/password'

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  helperText?: string
  /** Show the strength meter below the field. Only meaningful for "new password" fields. */
  showStrength?: boolean
  strengthValue?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, label, id, helperText, showStrength, strengthValue, ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const strength = showStrength ? getPasswordStrength(strengthValue ?? '') : null

    return (
      <div className="w-full space-y-2">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-neutral-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            type={visible ? 'text' : 'password'}
            className={cn(
              'flex h-10 w-full rounded-md border border-neutral-border bg-neutral-surface px-4 py-2 text-md pr-10',
              'placeholder:text-neutral-text-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-status-error focus-visible:ring-status-error',
              className
            )}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-text-muted hover:text-neutral-text-primary transition-colors"
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {strength && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${n <= strength.level ? strength.color : 'bg-neutral-border'}`}
                />
              ))}
            </div>
            <p className="text-xs text-neutral-text-muted">{strength.label}</p>
          </div>
        )}
        {error ? (
          <p className="text-sm text-status-error">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-neutral-text-muted">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
