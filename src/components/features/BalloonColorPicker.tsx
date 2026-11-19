import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { BalloonIcon } from '@/components/features/BalloonIcon'
import { BALLOON_PALETTE, isValidBalloonColor, resolveBalloonColor } from '@/lib/balloon'
import { cn } from '@/lib/utils'

interface BalloonColorPickerProps {
  /** Letra del problema (A, B, ...). */
  letter: string
  /** Título del problema, se muestra en el panel. */
  title: string
  /** Color guardado o elegido. null/undefined/inválido = sin color (se ve blanco). */
  color: string | null | undefined
  /** Recibe "#rrggbb" en minúsculas, o null cuando se quita el color. */
  onChange: (color: string | null) => void
  disabled?: boolean
  /** 'chip': globo + hex (formularios). 'letter': globo grande con la letra (tabla). */
  variant?: 'chip' | 'letter'
}

export function BalloonColorPicker({ letter, title, color, onChange, disabled, variant = 'chip' }: BalloonColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [invalid, setInvalid] = useState(false)

  const current = resolveBalloonColor(color)
  const hasColor = isValidBalloonColor(color)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setDraft(hasColor ? current : '')
      setInvalid(false)
    }
  }

  const choose = (value: string | null) => {
    onChange(value)
    setOpen(false)
  }

  const applyDraft = () => {
    if (isValidBalloonColor(draft)) choose(draft.toLowerCase())
    else setInvalid(true)
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        {variant === 'letter' ? (
          <button
            type="button"
            disabled={disabled}
            aria-label={`Color del problema ${letter}`}
            title="Cambiar el color del globo"
            className="rounded-md p-1 transition hover:-translate-y-0.5 hover:bg-brand-primary-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-transparent"
          >
            <BalloonIcon color={current} letter={letter} className="h-11 w-9" />
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            aria-label={`Color del problema ${letter}`}
            className="inline-flex items-center gap-2 rounded-pill border border-neutral-border bg-neutral-surface py-1 pl-2 pr-3 text-xs font-semibold text-neutral-text-primary transition-colors hover:border-brand-primary hover:bg-brand-primary-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-neutral-border disabled:hover:bg-neutral-surface"
          >
            <BalloonIcon color={current} />
            <span className={cn(!hasColor && 'text-neutral-text-muted')}>{hasColor ? current : 'Sin color'}</span>
          </button>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          aria-label={`Color del globo del problema ${letter}`}
          className="z-50 w-72 rounded-md border border-neutral-border bg-neutral-surface p-4 shadow-elevation-2"
        >
          <div className="mb-3 flex items-center gap-3">
            <BalloonIcon color={current} letter={letter} className="h-9 w-7" />
            <div>
              <p className="text-sm font-semibold text-neutral-text-primary">
                {letter} · {title}
              </p>
              <p className="text-xs text-neutral-text-muted">Color del globo</p>
            </div>
          </div>

          <div role="group" aria-label="Colores sugeridos" className="grid grid-cols-6 gap-2">
            {BALLOON_PALETTE.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={hasColor && swatch === current}
                onClick={() => choose(swatch)}
                style={{ backgroundColor: swatch }}
                className={cn(
                  'aspect-square w-full rounded-full ring-1 ring-inset ring-black/10 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
                  hasColor && swatch === current && 'outline outline-2 outline-offset-2 outline-brand-primary',
                )}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-neutral-border pt-3">
            <input
              type="color"
              aria-label="Selector de color"
              value={isValidBalloonColor(draft) ? draft.toLowerCase() : current}
              onChange={(e) => {
                setDraft(e.target.value)
                setInvalid(false)
              }}
              className="h-8 w-9 shrink-0 cursor-pointer rounded-sm border border-neutral-border bg-neutral-surface"
            />
            <input
              type="text"
              aria-label="Código hexadecimal"
              value={draft}
              maxLength={7}
              placeholder="#RRGGBB"
              onChange={(e) => {
                setDraft(e.target.value)
                setInvalid(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  applyDraft()
                }
              }}
              className="min-w-0 flex-1 rounded-sm border border-neutral-border px-2 py-1.5 font-mono text-xs lowercase"
            />
            <button
              type="button"
              onClick={applyDraft}
              className="rounded-sm bg-brand-primary px-3 py-1.5 text-xs font-semibold text-text-inverse hover:opacity-90"
            >
              Usar
            </button>
          </div>
          {invalid && (
            <p role="alert" className="mt-2 text-xs text-status-error">
              Usa el formato #RRGGBB
            </p>
          )}

          <button
            type="button"
            onClick={() => choose(null)}
            className="mt-3 text-xs font-semibold text-neutral-text-muted hover:text-status-error"
          >
            Quitar color
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
