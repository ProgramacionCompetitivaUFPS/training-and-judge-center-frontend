import { AlertTriangle, ArrowRight, Check, CircleDashed, Loader2 } from 'lucide-react'
import { Button, Card, CardContent, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface PublishChecklistStep {
  key: string
  label: string
  met: boolean
  /** What is missing, in a few words, shown under the label while the step is pending */
  hint: string
  /** Label of the button that leads to where the step is fixed */
  actionLabel: string
  onAction: () => void
  /** The step cannot be done yet (it depends on the ones before it) */
  disabled?: boolean
  /** The action is running: a validation takes a while */
  loading?: boolean
  /** Leads to a longer explanation of the step's result, when there is one */
  onDetail?: () => void
  /** Shown as an amber warning with a tooltip when the step is met but still has a concern */
  warning?: string
}

interface PublishChecklistProps {
  steps: PublishChecklistStep[]
  /** The optional pieces (checker, validator) that are not uploaded yet */
  optionalMissing: string[]
  onOptionalAction: () => void
  className?: string
}

// Shown on a draft to the people who can edit it: what is still missing before Publicar
// works, and a button on each pending step that leads to where it gets done. The last step is
// the validation: the problem has to compile and pass its own solutions before it can be published.
export function PublishChecklist({ steps, optionalMissing, onOptionalAction, className }: PublishChecklistProps) {
  const done = steps.filter((s) => s.met).length
  const ready = done === steps.length

  return (
    <Card className={className}>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold text-neutral-text-primary">Antes de publicar</h2>
          <span className="text-xs text-neutral-text-muted">{done} de {steps.length} listos</span>
        </div>

        <ol className="divide-y divide-neutral-border">
          {steps.map((step) => {
            const row = (
            <li key={step.key} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              {step.met ? (
                step.warning ? (
                  // The whole row is the tooltip trigger (see below); the icon only signals it
                  <AlertTriangle className="h-4 w-4 shrink-0 text-status-warning" aria-label="Advertencia" />
                ) : (
                  <Check className="h-4 w-4 shrink-0 text-status-success" aria-label="Listo" />
                )
              ) : step.loading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-status-warning" aria-label="En curso" />
              ) : (
                <CircleDashed className="h-4 w-4 shrink-0 text-status-warning" aria-label="Pendiente" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm', step.met ? 'text-neutral-text-muted' : 'font-medium text-neutral-text-primary')}>
                  {step.label}
                </p>
                {!step.met && step.hint && (
                  <p className="text-xs text-neutral-text-muted">
                    {step.hint}
                    {step.onDetail && (
                      <>
                        {' '}
                        <button type="button" className="underline underline-offset-2 hover:text-neutral-text-primary" onClick={step.onDetail}>
                          Ver detalle
                        </button>
                      </>
                    )}
                  </p>
                )}
              </div>
              {!step.met && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={step.onAction}
                  disabled={step.disabled || step.loading}
                >
                  {step.actionLabel}
                  {!step.loading && <ArrowRight className="h-3.5 w-3.5" />}
                </Button>
              )}
            </li>
            )
            if (!step.met || !step.warning) return row
            // Hovering anywhere on a step with a warning shows the warning, not just the icon
            return (
              <Tooltip key={step.key}>
                <TooltipTrigger asChild>{row}</TooltipTrigger>
                <TooltipContent>{step.warning}</TooltipContent>
              </Tooltip>
            )
          })}
        </ol>

        {optionalMissing.length > 0 && (
          <p className="text-xs text-neutral-text-muted">
            Opcional: {optionalMissing.join(' · ')}.{' '}
            <button type="button" className="underline underline-offset-2 hover:text-neutral-text-primary" onClick={onOptionalAction}>
              Ver
            </button>
          </p>
        )}

        <p className="text-xs text-neutral-text-muted border-t border-neutral-border pt-3">
          {ready
            ? 'Todo listo: ya puedes publicar.'
            : 'Publicar se habilita cuando todos los pasos estén listos. Validar compila el problema y lo prueba con sus soluciones, sin publicarlo.'}
        </p>
      </CardContent>
    </Card>
  )
}
