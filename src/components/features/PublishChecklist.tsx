import { ArrowRight, Check, CircleDashed } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { useLatestValidation } from '@/hooks/api/useProblems'
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
}

interface PublishChecklistProps {
  slug: string
  steps: PublishChecklistStep[]
  /** The optional pieces (checker, validator) that are not uploaded yet */
  optionalMissing: string[]
  onOptionalAction: () => void
  /** Leads to where the full report of the last validation is */
  onSeeValidation: () => void
  className?: string
}

// Same query as the "Última validación" card, so it costs no extra request.
function LastValidationLine({ slug, onSeeDetail }: { slug: string; onSeeDetail: () => void }) {
  const { data } = useLatestValidation(slug)
  if (!data) return null
  const running = data.found && !data.terminal
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-2 text-neutral-text-muted">
        Última validación:
        {!data.found ? (
          'aún no se ha validado'
        ) : running ? (
          <Badge variant="warning">Validando</Badge>
        ) : data.passed ? (
          <Badge variant="success">Pasó</Badge>
        ) : (
          <Badge variant="error">Falló</Badge>
        )}
      </span>
      {data.found && (
        <button type="button" className="shrink-0 underline underline-offset-2 text-neutral-text-muted hover:text-neutral-text-primary" onClick={onSeeDetail}>
          Ver detalle
        </button>
      )}
    </div>
  )
}

// Shown on a draft to the people who can edit it: what is still missing before Publicar
// works, and a button on each missing step that leads to where it gets fixed. Having every
// step done only means the backend will start validating, not that the validation will pass.
export function PublishChecklist({ slug, steps, optionalMissing, onOptionalAction, onSeeValidation, className }: PublishChecklistProps) {
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
          {steps.map((step) => (
            <li key={step.key} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              {step.met ? (
                <Check className="h-4 w-4 shrink-0 text-status-success" aria-label="Listo" />
              ) : (
                <CircleDashed className="h-4 w-4 shrink-0 text-status-warning" aria-label="Pendiente" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm', step.met ? 'text-neutral-text-muted' : 'font-medium text-neutral-text-primary')}>
                  {step.label}
                </p>
                {!step.met && <p className="text-xs text-neutral-text-muted">{step.hint}</p>}
              </div>
              {!step.met && (
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={step.onAction}>
                  {step.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ol>

        {optionalMissing.length > 0 && (
          <p className="text-xs text-neutral-text-muted">
            Opcional: {optionalMissing.join(' · ')}.{' '}
            <button type="button" className="underline underline-offset-2 hover:text-neutral-text-primary" onClick={onOptionalAction}>
              Ver
            </button>
          </p>
        )}

        <div className="space-y-2 border-t border-neutral-border pt-3">
          <p className="text-xs text-neutral-text-muted">
            {ready ? 'Tiene todo lo necesario. ' : ''}
            Al publicar se compila y se prueba todo; el resultado queda en «Última validación».
          </p>
          <LastValidationLine slug={slug} onSeeDetail={onSeeValidation} />
        </div>
      </CardContent>
    </Card>
  )
}
