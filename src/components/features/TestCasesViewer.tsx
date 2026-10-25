import { useState } from 'react'
import { Download, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import {
  useProblemTestCases,
  useProblemTestCase,
  useDownloadTestCases,
} from '@/hooks/api/useProblems'
import { useToastContext } from '@/hooks/useToastContext'
import { ApiClientError } from '@/lib/errors'
import { getErrorMessage } from '@/lib/errorMessages'
import { formatBytes } from '@/lib/utils'
import type { TestCaseKind, TestCaseSummary } from '@/types/problem'

const KIND_LABEL: Record<TestCaseKind, string> = { sample: 'Ejemplo', secret: 'Secreto' }

interface TestCasesViewerProps {
  slug: string
}

/**
 * Lets whoever can edit a problem check what its uploaded test cases hold — until now the only
 * way was to delete the ZIP and upload it again. The list is only requested once opened: the
 * backend reads the whole ZIP from storage to answer it.
 */
export function TestCasesViewer({ slug }: TestCasesViewerProps) {
  const { toast } = useToastContext()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<{ kind: TestCaseKind; name: string } | null>(null)

  const { data, isLoading, isError, error, refetch } = useProblemTestCases(slug, open)
  const downloadMutation = useDownloadTestCases()

  function handleDownload() {
    downloadMutation.mutate(slug, {
      onError: (err) => toast({ variant: 'error', title: 'No se pudo descargar el ZIP', description: getErrorMessage(err) }),
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle>Casos de prueba</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              {open ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
              {open ? 'Ocultar' : 'Ver casos'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} isLoading={downloadMutation.isPending}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Descargar ZIP
            </Button>
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-3">
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

          {data && data.hasTestCases && (
            <>
              <p className="text-sm text-neutral-text-muted">
                {data.sampleCount} de ejemplo · {data.secretCount} {data.secretCount === 1 ? 'secreto' : 'secretos'}
              </p>
              <ul className="max-h-80 overflow-y-auto divide-y divide-neutral-border rounded-md border border-neutral-border">
                {data.cases.map((c) => (
                  <TestCaseRow key={`${c.kind}/${c.name}`} testCase={c} onView={() => setSelected({ kind: c.kind, name: c.name })} />
                ))}
              </ul>
            </>
          )}
        </CardContent>
      )}

      <TestCaseDialog slug={slug} selected={selected} onClose={() => setSelected(null)} />
    </Card>
  )
}

function TestCaseRow({ testCase, onView }: { testCase: TestCaseSummary; onView: () => void }) {
  const missing = testCase.inputBytes === null ? '.in' : testCase.answerBytes === null ? '.ans' : null
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant={testCase.kind === 'sample' ? 'primary' : 'outline'} className="text-[10px]">
          {KIND_LABEL[testCase.kind]}
        </Badge>
        <span className="font-mono text-neutral-text-primary truncate">{testCase.name}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {missing ? (
          <span className="inline-flex items-center gap-1 text-xs text-status-warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            Falta el archivo {missing}
          </span>
        ) : (
          <span className="text-xs text-neutral-text-muted font-mono">
            {formatBytes(testCase.inputBytes!)} / {formatBytes(testCase.answerBytes!)}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onView}
          aria-label={`Ver caso ${KIND_LABEL[testCase.kind].toLowerCase()} ${testCase.name}`}
        >
          Ver
        </Button>
      </div>
    </li>
  )
}

function TestCaseDialog({
  slug,
  selected,
  onClose,
}: {
  slug: string
  selected: { kind: TestCaseKind; name: string } | null
  onClose: () => void
}) {
  const { data, isLoading, isError, error } = useProblemTestCase(slug, selected?.kind ?? 'sample', selected?.name ?? '', !!selected)

  return (
    <Dialog open={!!selected} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Caso {selected ? KIND_LABEL[selected.kind].toLowerCase() : ''}{' '}
            <span className="font-mono">{selected?.name}</span>
          </DialogTitle>
          <DialogDescription>Lo que el juez recibe y lo que espera como respuesta.</DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && <p className="text-sm text-status-error">{getErrorMessage(error)}</p>}

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Pane label="Entrada" text={data.input} truncated={data.inputTruncated} />
            <Pane label="Salida esperada" text={data.answer} truncated={data.answerTruncated} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Pane({ label, text, truncated }: { label: string; text: string; truncated: boolean }) {
  return (
    <div className="min-w-0">
      <span className="block mb-2 text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">{label}</span>
      <pre className="font-mono text-sm text-neutral-text-primary whitespace-pre bg-neutral-background rounded-md p-3 overflow-auto max-h-80">
        {text === '' ? <span className="text-neutral-text-muted italic">(vacío)</span> : text}
      </pre>
      {truncated && (
        <p className="mt-1 text-xs text-status-warning">Se muestran solo los primeros 64 KB. Descarga el ZIP para ver el archivo completo.</p>
      )}
    </div>
  )
}
