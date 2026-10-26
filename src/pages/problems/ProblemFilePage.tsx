import React, { Suspense, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Download, WrapText } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { LoadErrorBoundary } from '@/components/ui/LoadErrorBoundary'
import { useProblemDetail, useProblemSourceFile } from '@/hooks/api/useProblems'
import { useToastContext } from '@/hooks/useToastContext'
import { PATHS, codeModeOf } from '@/lib/constants'
import { saveBlobAs } from '@/lib/download'
import { getErrorMessage } from '@/lib/errorMessages'
import { formatBytes } from '@/lib/utils'
import type { ProblemSourceFileType } from '@/types/problem'

const CodeBlockViewer = React.lazy(() => import('@/components/features/CodeBlockViewer'))

const FILE_TYPES: ProblemSourceFileType[] = ['solution', 'checker', 'validator']
const FILE_TYPE_LABEL: Record<ProblemSourceFileType, string> = { solution: 'Solución', checker: 'Checker', validator: 'Validador' }

/**
 * A solution, checker or validator of a problem, in full. The dialog on the problem page is the
 * quick look (and cuts long files); this is where a problem setter reads everything they uploaded.
 * It is its own URL so it can be opened in a new tab, bookmarked or shared with a co-author.
 */
export function ProblemFilePage() {
  const params = useParams<{ slug: string; fileType?: string; fileName?: string }>()
  const { slug = '', fileName } = params
  // The solution route has a literal "solution" segment instead of a :fileType parameter
  const fileType = params.fileType ?? (fileName ? 'solution' : '')
  const { toast } = useToastContext()
  const [wrap, setWrap] = useState(false)

  const valid = (FILE_TYPES as string[]).includes(fileType) && (fileType !== 'solution' || !!fileName)
  const type = fileType as ProblemSourceFileType
  const { data: problem } = useProblemDetail(slug)
  const { data: file, isLoading, isError, error } = useProblemSourceFile(slug, type, fileName, valid, true)

  const title = file?.filename ?? fileName ?? FILE_TYPE_LABEL[type] ?? fileType
  const breadcrumbs = [
    { label: 'Problemas', href: '/problems' },
    { label: problem?.title ?? slug, href: PATHS.problem(slug) },
    { label: title },
  ]

  async function handleCopy() {
    if (!file) return
    try {
      await navigator.clipboard.writeText(file.content)
      toast({ variant: 'success', title: 'Código copiado' })
    } catch {
      toast({ variant: 'error', title: 'No se pudo copiar', description: 'El navegador no permitió acceder al portapapeles.' })
    }
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold text-neutral-text-primary font-mono break-all">{title}</h1>
              {valid && <Badge variant="outline">{FILE_TYPE_LABEL[type]}</Badge>}
              {file && <Badge variant="outline">{file.language}</Badge>}
            </div>
            <p className="text-sm text-neutral-text-muted mt-1">
              {file ? `${formatBytes(file.sizeBytes)} · archivo completo` : 'Código que el juez usa para este problema.'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={PATHS.problem(slug)}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Volver al problema
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => setWrap((v) => !v)} aria-pressed={wrap}>
              <WrapText className="h-3.5 w-3.5 mr-1" />
              {wrap ? 'No ajustar líneas' : 'Ajustar líneas'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!file}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copiar todo
            </Button>
            <Button variant="outline" size="sm" onClick={() => file && saveBlobAs(new Blob([file.content], { type: 'text/plain' }), file.filename)} disabled={!file}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Descargar
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {!valid && <p className="text-sm text-status-error">Este archivo no existe.</p>}
            {valid && isLoading && <Skeleton className="h-[70vh] w-full" />}
            {valid && isError && <p className="text-sm text-status-error">{getErrorMessage(error)}</p>}
            {file && (
              <LoadErrorBoundary
                fallback={<p className="text-sm text-status-error">No se pudo cargar el visor. Recarga la página, o usa «Descargar».</p>}
              >
                <Suspense fallback={<Skeleton className="h-[70vh] w-full" />}>
                  <CodeBlockViewer value={file.content} mode={codeModeOf(file.language)} wrap={wrap} ariaLabel={`Código de ${file.filename}`} />
                </Suspense>
              </LoadErrorBoundary>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
