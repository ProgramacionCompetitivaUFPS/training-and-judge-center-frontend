import type { UseFormRegisterReturn } from 'react-hook-form'

import { Input } from '@/components/ui'
import type { AutoRevealMode } from '@/lib/autoReveal'

const AUTO_REVEAL_OPTIONS: { value: AutoRevealMode; label: string }[] = [
  { value: 'manual', label: 'Solo manualmente' },
  { value: 'onFinish', label: 'Al terminar la competencia' },
  { value: 'delay', label: 'Minutos después del fin' },
]

interface AutoRevealFieldProps {
  mode: AutoRevealMode
  onModeChange: (mode: AutoRevealMode) => void
  delayInputProps: UseFormRegisterReturn
  delayError?: string
}

/** Radio de tres modos para revelar los resultados; pide los minutos solo en modo «Minutos después del fin». */
export function AutoRevealField({ mode, onModeChange, delayInputProps, delayError }: AutoRevealFieldProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-neutral-text-primary">Revelado de resultados</legend>
      <p className="text-xs text-neutral-text-muted">
        Mientras no se revelen, los participantes ven la tabla congelada aunque la competencia ya haya terminado.
      </p>
      {AUTO_REVEAL_OPTIONS.map(({ value, label }) => (
        <label key={value} className="flex items-center gap-2 text-sm text-neutral-text-primary">
          <input
            type="radio"
            name="autoRevealMode"
            value={value}
            checked={mode === value}
            onChange={() => onModeChange(value)}
          />
          {label}
        </label>
      ))}
      {mode === 'delay' && (
        <Input type="number" min={1} label="Minutos de espera" error={delayError} {...delayInputProps} />
      )}
    </fieldset>
  )
}
