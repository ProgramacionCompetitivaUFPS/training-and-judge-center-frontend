import { useState } from 'react'
import { Download, AlertTriangle } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { useProblemTestCases, useProblemTestCase, useDownloadTestCases } from '@/hooks/api/useProblems'
import { useToastContext } from '@/hooks/useToastContext'
import { ApiClientError } from '@/lib/errors'
import { getErrorMessage } from '@/lib/errorMessages'
import { cn, formatBytes } from '@/lib/utils'
import type { TestCaseKind, TestCaseSummary } from '@/types/problem'

const KIND_LABEL: Record<TestCaseKind, string> = { sample: 'Ejemplo', secret: 'Secreto' }

interface TestCasesDialogProps {
  slug: string
  open: boolean
  onClose: () => void
}

/**
 * Lets whoever can edit a problem check what its uploaded test cases hold: the list on the left,
 * the selected case on the right. Until this existed the only way was to delete the ZIP and upload
 * it again. The list is only requested while the dialog is open: the backend reads the whole ZIP
 * from storage to answer it.
 */
export function TestCasesDialog({ slug, open, onClose }: TestCasesDialogProps) {
  const { toast } = useToastContext()
  const [selected, setSelected] = useState<{ kind: TestCaseKind; name: string } | null>(null)

  const { data, isLoading, isError, error, refetch } = useProblemTestCases(slug, open)
  const downloadMutation = useDownloadTestCases()

  // The first case until the user picks one, and also if the picked one is gone (the ZIP was replaced).
  const current = data?.cases.find((c) => c.kind === selected?.kind && c.name === selected?.name) ?? data?.cases[0]

  function handleDownload() {
    downloadMutation.mutate(slug, {
      onError: (err) => toast({ variant: 'error', title: 'No se pudo descargar el ZIP', description: getErrorMessage(err) }),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Casos de prueba</DialogTitle>
          <DialogDescription>
            {data?.hasTestCases
              ? `${data.sampleCount} de ejemplo · ${data.secretCount} ${data.secretCount === 1 ? 'secreto' : 'secretos'}`
              : 'Lo que el juez recibe y lo que espera como respuesta.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-2" aria-label="Cargando casos de prueba">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-status-error/30 bg-status-error/5 p-3 text-sm">
            <span className="text-status-error">
              {error instanceof ApiClientError && error.code === 'PROBLEM_FILE_NOT_FOUND'
                ? 'El ZIP de casos de prueba ya no está en el almacenamiento. Súbelo de nuevo.'
                : getErrorMessage(error)}
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>
          </div>
        )}

        {data && !data.hasTestCases && (
          <p className="text-sm text-neutral-text-muted">Aún no hay casos de prueba subidos.</p>
        )}

        {data?.hasTestCases && current && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleDownload} isLoading={downloadMutation.isPending}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Descargar ZIP
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[15rem_1fr] gap-4 min-w-0">
              <ul className="max-h-[60vh] overflow-y-auto divide-y divide-neutral-border rounded-md border border-neutral-border">
                {data.cases.map((c) => (
                  <CaseRow
                    key={`${c.kind}/${c.name}`}
                    testCase={c}
                    active={c.kind === current.kind && c.name === current.name}
                    onSelect={() => setSelected({ kind: c.kind, name: c.name })}
                  />
                ))}
              </ul>
              <CasePreview slug={slug} kind={current.kind} name={current.name} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CaseRow({ testCase, active, onSelect }: { testCase: TestCaseSummary; active: boolean; onSelect: () => void }) {
  const missing = testCase.inputBytes === null ? '.in' : testCase.answerBytes === null ? '.ans' : null
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'true' : undefined}
        aria-label={`Caso ${KIND_LABEL[testCase.kind].toLowerCase()} ${testCase.name}`}
        className={cn(
          'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors',
          active ? 'bg-brand-primary-muted' : 'hover:bg-neutral-background',
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Badge variant={testCase.kind === 'sample' ? 'primary' : 'outline'} className="text-[10px] shrink-0">
            {KIND_LABEL[testCase.kind]}
          </Badge>
          <span className="font-mono text-neutral-text-primary truncate">{testCase.name}</span>
        </span>
        {missing ? (
          <span className="inline-flex items-center gap-1 text-xs text-status-warning shrink-0" title={`Falta el archivo ${missing}`}>
            <AlertTriangle className="h-3.5 w-3.5" />
            {missing}
          </span>
        ) : (
          <span className="text-[11px] text-neutral-text-muted font-mono shrink-0">
            {formatBytes(testCase.inputBytes!)} / {formatBytes(testCase.answerBytes!)}
          </span>
        )}
      </button>
    </li>
  )
}

function CasePreview({ slug, kind, name }: { slug: string; kind: TestCaseKind; name: string }) {
  const { data, isLoading, isError, error } = useProblemTestCase(slug, kind, name, true)

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (isError) return <p className="text-sm text-status-error">{getErrorMessage(error)}</p>
  if (!data) return null

  return (
    <div className="space-y-4 min-w-0">
      <Pane label="Entrada" text={data.input} truncated={data.inputTruncated} />
      <Pane label="Salida esperada" text={data.answer} truncated={data.answerTruncated} />
    </div>
  )
}

function Pane({ label, text, truncated }: { label: string; text: string; truncated: boolean }) {
  return (
    <div className="min-w-0">
      <span className="block mb-2 text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">{label}</span>
      <pre className="font-mono text-sm text-neutral-text-primary whitespace-pre bg-neutral-background rounded-md p-3 overflow-auto max-h-48">
        {text === '' ? <span className="text-neutral-text-muted italic">(vacío)</span> : text}
      </pre>
      {truncated && (
        <p className="mt-1 text-xs text-status-warning">Se muestran solo los primeros 64 KB. Descarga el ZIP para ver el archivo completo.</p>
      )}
    </div>
  )
}
