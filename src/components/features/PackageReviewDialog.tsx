import { AlertTriangle, CheckCircle2, MinusCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import type { PackageFinding, PackageReview } from '@/lib/problemPackage'

interface PackageReviewDialogProps {
  open: boolean
  fileName: string
  /** The slug the problem will be created with. */
  slug: string
  review: PackageReview | null
  /** The ZIP was too big to read in the browser: nothing was checked, the server will validate it. */
  unreviewed?: boolean
  isImporting: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * What an ICPC package holds, and what is wrong with it, shown before anything is uploaded. Errors
 * are what the backend would reject (the import is blocked until the ZIP is fixed); warnings are
 * what it would accept but probably not what the author meant (the statement not being read, files
 * silently ignored).
 */
export function PackageReviewDialog({ open, fileName, slug, review, unreviewed = false, isImporting, onCancel, onConfirm }: PackageReviewDialogProps) {
  const errors = review?.findings.filter((f) => f.level === 'error') ?? []
  const warnings = review?.findings.filter((f) => f.level === 'warning') ?? []
  const s = review?.summary

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isImporting && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar el paquete antes de importar</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{fileName}</span> · se creará como <span className="font-mono">{slug}</span>
          </DialogDescription>
        </DialogHeader>

        {unreviewed && (
          <p className="flex items-start gap-2 rounded-md border border-status-warning/30 bg-status-warning/5 p-3 text-sm text-neutral-text-primary" role="status">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-status-warning" />
            <span>
              Este ZIP es demasiado grande para revisarlo aquí, así que no sé qué contiene. Si no es un paquete de problema,
              el servidor lo rechazará al importar.
            </span>
          </p>
        )}

        {review && s && (
          <div className="space-y-4">
            {errors.length === 0 && (
              <p className="flex items-center gap-2 text-sm text-status-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                El paquete cumple lo que el importador exige.
                {warnings.length > 0 && ` Revisa ${warnings.length === 1 ? 'el aviso' : `los ${warnings.length} avisos`}.`}
              </p>
            )}

            <ul className="rounded-md border border-neutral-border divide-y divide-neutral-border text-sm" aria-label="Contenido del paquete">
              <Row ok={!!s.title} label="Título" value={s.title ? `«${s.title}» (el de problem.yaml)` : undefined} />
              <Row
                ok={s.timeLimitSeconds !== undefined && s.memoryLimitMb !== undefined}
                label="Límites"
                value={
                  s.timeLimitSeconds !== undefined || s.memoryLimitMb !== undefined
                    ? [s.timeLimitSeconds !== undefined && `${s.timeLimitSeconds} s`, s.memoryLimitMb !== undefined && `${s.memoryLimitMb} MB`].filter(Boolean).join(' · ')
                    : undefined
                }
              />
              <Row ok={s.hasStatement} label="Enunciado" value={s.hasStatement ? 'problem_statement/problem.en.tex' : undefined} />
              <Row
                ok={s.sampleCases + s.secretCases > 0}
                label="Casos de prueba"
                value={s.sampleCases + s.secretCases > 0 ? `${s.sampleCases} de ejemplo · ${s.secretCases} secretos` : undefined}
              />
              <Row ok={s.solutions.length > 0} label="Soluciones" value={s.solutions.length ? s.solutions.join(', ') : undefined} />
              <Row ok={!!s.checker} label="Checker" value={s.checker} optional />
              <Row ok={!!s.validator} label="Validador" value={s.validator} optional />
            </ul>

            {errors.length > 0 && (
              <FindingList
                title="Hay que corregir esto antes de importar"
                subtitle="El servidor rechazaría el paquete por:"
                findings={errors}
                tone="error"
              />
            )}
            {warnings.length > 0 && (
              <FindingList title="Avisos" subtitle="Se importaría, pero quizá no es lo que querías:" findings={warnings} tone="warning" />
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isImporting}>
            {errors.length > 0 ? 'Elegir otro ZIP' : 'Cancelar'}
          </Button>
          <Button variant="primary" onClick={onConfirm} isLoading={isImporting} disabled={review ? !review.canImport : !unreviewed}>
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ ok, label, value, optional = false }: { ok: boolean; label: string; value?: string; optional?: boolean }) {
  return (
    <li className="flex items-start gap-3 px-3 py-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-status-success" aria-label="Incluido" />
      ) : (
        <MinusCircle className="h-4 w-4 mt-0.5 shrink-0 text-neutral-text-muted" aria-label={optional ? 'No incluido (opcional)' : 'No incluido'} />
      )}
      <span className="w-32 shrink-0 text-neutral-text-muted">{label}</span>
      <span className={ok ? 'text-neutral-text-primary break-words min-w-0' : 'text-neutral-text-muted'}>
        {value ?? (optional ? 'No incluido (opcional)' : 'No incluido')}
      </span>
    </li>
  )
}

function FindingList({ title, subtitle, findings, tone }: { title: string; subtitle: string; findings: PackageFinding[]; tone: 'error' | 'warning' }) {
  const Icon = tone === 'error' ? XCircle : AlertTriangle
  return (
    <section
      className={tone === 'error' ? 'rounded-md border border-status-error/30 bg-status-error/5 p-3' : 'rounded-md border border-status-warning/30 bg-status-warning/5 p-3'}
      aria-label={title}
    >
      <p className={`text-sm font-semibold ${tone === 'error' ? 'text-status-error' : 'text-status-warning'}`}>{title}</p>
      <p className="text-xs text-neutral-text-muted mb-2">{subtitle}</p>
      <ul className="space-y-2">
        {findings.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${tone === 'error' ? 'text-status-error' : 'text-status-warning'}`} />
            <span className="min-w-0">
              <span className="text-neutral-text-primary break-words">{f.message}</span>
              {f.hint && <span className="block text-xs text-neutral-text-muted break-words">{f.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
