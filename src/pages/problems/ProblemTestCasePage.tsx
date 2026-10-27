import React, { Suspense, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Download, WrapText } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge, Button, Card, CardContent, LinkButton } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { LoadErrorBoundary } from '@/components/ui/LoadErrorBoundary'
import { useProblemDetail, useProblemTestCases, useProblemTestCasePart, useDownloadTestCases } from '@/hooks/api/useProblems'
import { useToastContext } from '@/hooks/useToastContext'
import { PATHS } from '@/lib/constants'
import { saveBlobAs } from '@/lib/download'
import { ApiClientError } from '@/lib/errors'
import { getErrorMessage } from '@/lib/errorMessages'
import { formatBytes } from '@/lib/utils'
import type { TestCaseKind } from '@/types/problem'

const CodeBlockViewer = React.lazy(() => import('@/components/features/CodeBlockViewer'))

const KIND_LABEL: Record<TestCaseKind, string> = { sample: 'Ejemplo', secret: 'Secreto' }

/**
 * One test case in full, input and expected output side by side, with the means to move through
 * the rest: previous / next and a selector with every case (a problem can have thousands, and
 * this is the only place where they are browsed). Its own URL, so it opens in a new tab and can
 * be shared; "Volver" returns to the files tab of the problem.
 */
export function ProblemTestCasePage() {
  const { slug = '', kind = '', name = '' } = useParams<{ slug: string; kind: string; name: string }>()
  const navigate = useNavigate()
  const { toast } = useToastContext()
  const [wrap, setWrap] = useState(false)
  const downloadZip = useDownloadTestCases()

  const valid = kind === 'sample' || kind === 'secret'
  const caseKind = kind as TestCaseKind
  const { data: problem } = useProblemDetail(slug)
  const { data: list } = useProblemTestCases(slug, valid)

  const index = list ? list.cases.findIndex((c) => c.kind === caseKind && c.name === name) : -1
  const current = index >= 0 ? list?.cases[index] : undefined
  const prev = index > 0 ? list?.cases[index - 1] : undefined
  const next = list && index >= 0 && index < list.cases.length - 1 ? list.cases[index + 1] : undefined
  const caseHref = (c: { kind: TestCaseKind; name: string }) => PATHS.problemTestCase(slug, c.kind, c.name)

  const breadcrumbs = [
    { label: 'Problemas', href: '/problems' },
    { label: problem?.title ?? slug, href: PATHS.problem(slug) },
    { label: 'Archivos', href: PATHS.problemFiles(slug) },
    { label: `Caso ${name}` },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold text-neutral-text-primary">
                Caso <span className="font-mono break-all">{name}</span>
              </h1>
              {valid && <Badge variant={caseKind === 'sample' ? 'primary' : 'outline'}>{KIND_LABEL[caseKind]}</Badge>}
            </div>
            <p className="text-sm text-neutral-text-muted mt-1">
              {list && index >= 0 ? `Caso ${index + 1} de ${list.cases.length}` : 'Lo que el juez recibe y lo que espera como respuesta.'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <LinkButton to={PATHS.problemFiles(slug)} variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Volver a los archivos
            </LinkButton>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadZip.mutate(slug, { onError: (err) => toast({ variant: 'error', title: 'No se pudo descargar el ZIP', description: getErrorMessage(err) }) })}
              isLoading={downloadZip.isPending}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              ZIP con todos los casos
            </Button>
          </div>
        </div>

        {/* Moving between cases: previous / next, and a selector to jump to any of them */}
        {valid && (
          <div className="flex items-center gap-2 flex-wrap">
            {prev ? (
              <LinkButton to={caseHref(prev)} variant="outline" size="sm" aria-label={`Caso anterior: ${prev.name}`}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Anterior
              </LinkButton>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Anterior
              </Button>
            )}
            {next ? (
              <LinkButton to={caseHref(next)} variant="outline" size="sm" aria-label={`Caso siguiente: ${next.name}`}>
                Siguiente
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </LinkButton>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Siguiente
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
            {list && list.cases.length > 1 && (
              <>
                <label htmlFor="case-select" className="sr-only">Ir a otro caso</label>
                <select
                  id="case-select"
                  value={`${kind}/${name}`}
                  onChange={(e) => {
                    const [k, ...rest] = e.target.value.split('/')
                    navigate(PATHS.problemTestCase(slug, k as TestCaseKind, rest.join('/')))
                  }}
                  className="h-8 max-w-[14rem] rounded-sm border-2 border-neutral-border bg-neutral-surface px-2 text-sm text-neutral-text-primary"
                >
                  {list.cases.map((c) => (
                    <option key={`${c.kind}/${c.name}`} value={`${c.kind}/${c.name}`}>
                      {KIND_LABEL[c.kind]} · {c.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => setWrap((v) => !v)}
              aria-pressed={wrap}
              title="Cuando una línea es más ancha que la pantalla, la parte en varias líneas en vez de obligarte a deslizar en horizontal. No conviene en entradas de una sola línea muy larga."
            >
              <WrapText className="h-3.5 w-3.5 mr-1" />
              {wrap ? 'Líneas largas: partidas' : 'Líneas largas: con scroll'}
            </Button>
          </div>
        )}

        {!valid ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-status-error">Este caso no existe.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <PartPanel
              key={`${kind}/${name}/input`}
              slug={slug}
              kind={caseKind}
              name={name}
              part="input"
              label="Entrada"
              fileName={`${name}.in`}
              sizeBytes={current?.inputBytes}
              wrap={wrap}
            />
            <PartPanel
              key={`${kind}/${name}/answer`}
              slug={slug}
              kind={caseKind}
              name={name}
              part="answer"
              label="Salida esperada"
              fileName={`${name}.ans`}
              sizeBytes={current?.answerBytes}
              wrap={wrap}
            />
          </div>
        )}
      </div>
    </AppLayout>
  )
}

interface PartPanelProps {
  slug: string
  kind: TestCaseKind
  name: string
  part: 'input' | 'answer'
  label: string
  fileName: string
  /** Known from the list before the text arrives; null when the ZIP lacks this file. */
  sizeBytes: number | null | undefined
  wrap: boolean
}

function PartPanel({ slug, kind, name, part, label, fileName, sizeBytes, wrap }: PartPanelProps) {
  const { toast } = useToastContext()
  const { data: text, isLoading, isError, error } = useProblemTestCasePart(slug, kind, name, part, true)

  async function handleCopy() {
    if (text === undefined) return
    try {
      await navigator.clipboard.writeText(text)
      toast({ variant: 'success', title: `${label} copiada` })
    } catch {
      toast({ variant: 'error', title: 'No se pudo copiar', description: 'El navegador no permitió acceder al portapapeles.' })
    }
  }

  return (
    <Card className="min-w-0">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <span className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">{label}</span>
            {typeof sizeBytes === 'number' && <span className="ml-2 text-xs text-neutral-text-muted font-mono">{formatBytes(sizeBytes)}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={text === undefined}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copiar todo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => text !== undefined && saveBlobAs(new Blob([text], { type: 'text/plain' }), fileName)}
              disabled={text === undefined}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Descargar
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-[60vh] w-full" />
            {typeof sizeBytes === 'number' && sizeBytes > 1024 * 1024 && (
              <p className="text-xs text-neutral-text-muted">Cargando {formatBytes(sizeBytes)}…</p>
            )}
          </div>
        )}

        {isError && (
          <p className="text-sm text-status-error">
            {error instanceof ApiClientError && error.code === 'PROBLEM_FILE_NOT_FOUND'
              ? `Este caso no tiene archivo ${part === 'input' ? '.in' : '.ans'}.`
              : getErrorMessage(error)}
          </p>
        )}

        {text !== undefined && (
          <LoadErrorBoundary fallback={<p className="text-sm text-status-error">No se pudo cargar el visor. Usa «Descargar».</p>}>
            <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
              {text === '' ? (
                <p className="text-sm text-neutral-text-muted italic">(vacío)</p>
              ) : (
                <CodeBlockViewer value={text} wrap={wrap} height="60vh" ariaLabel={`${label} del caso ${name}`} />
              )}
            </Suspense>
          </LoadErrorBoundary>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * /problems/:slug/testcases: the entry to the test cases. They are browsed one at a time on their
 * own page (with previous / next and a selector), so this lands on the first one.
 */
export function ProblemTestCasesRedirect() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { data: list, isLoading, isError, error } = useProblemTestCases(slug, true)
  const first = list?.cases[0]

  if (first) return <Navigate to={PATHS.problemTestCase(slug, first.kind, first.name)} replace />

  return (
    <AppLayout breadcrumbs={[{ label: 'Problemas', href: '/problems' }, { label: slug, href: PATHS.problem(slug) }, { label: 'Casos de prueba' }]}>
      <Card>
        <CardContent className="pt-6 space-y-3">
          {isLoading && <Skeleton className="h-8 w-64" />}
          {isError && <p className="text-sm text-status-error">{getErrorMessage(error)}</p>}
          {list && !list.hasTestCases && <p className="text-sm text-neutral-text-muted">Este problema aún no tiene casos de prueba.</p>}
          <LinkButton to={PATHS.problemFiles(slug)} variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Volver a los archivos
          </LinkButton>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
