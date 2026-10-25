import { useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { Clock, HardDrive, Calendar, Code2, Eye, EyeOff, Download, ArrowLeft, RefreshCw, Puzzle } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import { CodeViewer } from '@/components/features/CodeViewer'
import { BlocklySvgViewer } from '@/components/features/BlocklySvgViewer'
import { useSubmissionDetail, useUpdateSubmissionVisibility, useRejudgeSubmission, useAdminRejudgeSubmission } from '@/hooks/api/useSubmissions'
import { downloadSubmissionBlob } from '@/api/submissions'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/hooks/useToastContext'
import { PROGRAMMING_LANGUAGES, PATHS, judgeLanguage } from '@/lib/constants'
import { ApiClientError, isNotFoundError } from '@/lib/errors'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import type { SubmissionOrigin } from '@/types/submission'
import { getErrorMessage } from '@/lib/errorMessages'

const SOURCE_CODE_UNAVAILABLE = 'Código fuente no disponible: el archivo de este envío ya no existe.'

export function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { toast } = useToastContext()

  const [showBlocklyCode, setShowBlocklyCode] = useState(false)

  const { data: submission, isLoading, error } = useSubmissionDetail(id || '')
  const visibilityMutation = useUpdateSubmissionVisibility()
  const ownRejudgeMutation = useRejudgeSubmission()
  const adminRejudgeMutation = useAdminRejudgeSubmission()

  // Where the user actually came from (a contest's/problem's submissions list, the
  // dashboard) — passed as router state by the page that linked here. Falls back to the
  // global "Mis Envíos" list for a direct URL visit, a refresh, or a shared link, where
  // there's no real origin to go back to.
  const origin = location.state as SubmissionOrigin | null | undefined
  const backTo = origin?.backTo ?? '/submissions'
  const backLabel = origin?.backLabel ?? 'Envíos'
  const breadcrumbPrefix = origin?.breadcrumbPrefix ?? []

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={[...breadcrumbPrefix, { label: backLabel, href: backTo }, { label: '...' }]}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    )
  }

  if (isNotFoundError(error)) return <NotFoundPage />

  if (error || !submission) {
    return (
      <AppLayout breadcrumbs={[...breadcrumbPrefix, { label: backLabel, href: backTo }, { label: 'Error' }]}>
        <div className="text-center py-12 text-neutral-text-muted">
          Envío no encontrado
        </div>
      </AppLayout>
    )
  }

  const isOwner = submission.submittedBy.nickname === user?.nickname
  const isAdmin = user?.role === 'ADMIN'
  const langLabel = PROGRAMMING_LANGUAGES.find((l) => l.value === submission.language)?.label ?? submission.language

  function handleToggleVisibility() {
    if (!submission) return
    const newVisibility = submission.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'
    visibilityMutation.mutate(
      { id: submission.id, data: { visibility: newVisibility } },
      {
        onSuccess: () => toast({ variant: 'success', title: `Visibilidad cambiada a ${newVisibility === 'PUBLIC' ? 'Pública' : 'Privada'}` }),
        onError: (err) => toast({ variant: 'error', title: 'Error al cambiar visibilidad', description: getErrorMessage(err) }),
      },
    )
  }

  function handleDownload() {
    if (!submission || submission.sourceCode === null) return
    // Blockly submissions are stored as their generated Python.
    const ext = judgeLanguage(submission.language)?.fileExtension ?? 'py'
    const filename = `${submission.submittedBy.nickname}_${submission.id.slice(0, 8)}.${ext}`
    downloadSubmissionBlob(submission.sourceCode, filename)
  }

  function handleRejudge() {
    if (!submission) return
    const mutation = isAdmin ? adminRejudgeMutation : ownRejudgeMutation
    mutation.mutate(submission.id, {
      onSuccess: () => toast({ variant: 'success', title: 'Envío enviado a rejuzgar' }),
      onError: (err) => {
        if (err instanceof ApiClientError && err.code === 'CANNOT_REJUDGE_IN_ACTIVE_CONTEST') {
          toast({ variant: 'error', title: 'No se puede rejuzgar', description: 'No puedes rejuzgar tus propios envíos de una competencia que todavía está activa.' })
        } else if (err instanceof ApiClientError && err.code === 'NO_REJUDGE_NEEDED') {
          toast({ variant: 'error', title: 'No se puede rejuzgar', description: 'Este envío no necesita rejuzgarse: los componentes de juzgamiento del problema no han cambiado desde que se envió.' })
        } else {
          toast({ variant: 'error', title: 'Error al rejuzgar envío' })
        }
      },
    })
  }

  const breadcrumbs = [
    ...breadcrumbPrefix,
    { label: backLabel, href: backTo },
    { label: `#${submission.id.slice(0, 8)}` },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <SubmissionStatusBadge status={submission.status} />
              <h1 className="text-2xl font-semibold text-neutral-text-primary">
                Envío #{submission.id.slice(0, 8)}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-text-muted">
              <span>Problema:</span>
              <Link
                to={PATHS.problem(submission.problem.slug)}
                className="text-brand-primary hover:underline"
              >
                {submission.problem.title}
              </Link>
              {submission.contest && (
                <>
                  <span>·</span>
                  <span>Competencia: {submission.contest.name}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <Button
                variant="outline"
                onClick={handleToggleVisibility}
                isLoading={visibilityMutation.isPending}
              >
                {submission.visibility === 'PUBLIC' ? (
                  <><EyeOff className="h-4 w-4 mr-2" />Hacer privado</>
                ) : (
                  <><Eye className="h-4 w-4 mr-2" />Hacer público</>
                )}
              </Button>
            )}
            {(isAdmin || isOwner) && (
              <Button
                variant="outline"
                onClick={handleRejudge}
                isLoading={isAdmin ? adminRejudgeMutation.isPending : ownRejudgeMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Rejuzgar
              </Button>
            )}
            <Button variant="outline" onClick={handleDownload} disabled={submission.sourceCode === null}>
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
            <Button variant="ghost" onClick={() => navigate(backTo)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetaItem icon={Code2} label="Lenguaje" value={langLabel} />
          <MetaItem
            icon={Clock}
            label="Tiempo"
            value={submission.executionTime != null ? `${submission.executionTime} ms` : '—'}
          />
          <MetaItem
            icon={HardDrive}
            label="Memoria"
            value={submission.memoryKb != null ? `${(submission.memoryKb / 1024).toFixed(1)} MiB` : '—'}
          />
          <MetaItem
            icon={Calendar}
            label="Enviado"
            value={new Date(submission.submittedAt).toLocaleString('es')}
          />
          <div className="flex items-center gap-2 text-sm">
            {submission.visibility === 'PUBLIC' ? (
              <Badge variant="primary">Público</Badge>
            ) : (
              <Badge variant="outline">Privado</Badge>
            )}
          </div>
        </div>

        {/* Source Code / Blockly SVG */}
        {(() => {
          const isBlocklySubmission = submission.language === 'blockly' && submission.blocksSvgUrl

          if (isBlocklySubmission) {
            return (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {showBlocklyCode ? (
                        <Code2 className="h-5 w-5" />
                      ) : (
                        <Puzzle className="h-5 w-5" />
                      )}
                      {showBlocklyCode ? 'Código Python' : 'Bloques'}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBlocklyCode((prev) => !prev)}
                    >
                      {showBlocklyCode ? (
                        <><Puzzle className="h-4 w-4 mr-2" />Bloques</>
                      ) : (
                        <><Code2 className="h-4 w-4 mr-2" />Código Python</>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showBlocklyCode ? (
                    submission.sourceCode === null ? (
                      <p className="text-sm text-neutral-text-muted">{SOURCE_CODE_UNAVAILABLE}</p>
                    ) : (
                      <CodeViewer code={submission.sourceCode} language={submission.language} />
                    )
                  ) : (
                    <BlocklySvgViewer svgUrl={submission.blocksSvgUrl!} alt="Bloques de la solución" />
                  )}
                </CardContent>
              </Card>
            )
          }

          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Código fuente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submission.sourceCode === null ? (
                  <p className="text-sm text-neutral-text-muted">{SOURCE_CODE_UNAVAILABLE}</p>
                ) : (
                  <CodeViewer code={submission.sourceCode} language={submission.language} />
                )}
              </CardContent>
            </Card>
          )
        })()}
      </div>
    </AppLayout>
  )
}

interface MetaItemProps { icon: React.ElementType; label: string; value: string }

function MetaItem({ icon: Icon, label, value }: MetaItemProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-neutral-text-muted flex-shrink-0" />
      <div>
        <div className="text-neutral-text-muted text-xs">{label}</div>
        <div className="text-neutral-text-primary">{value}</div>
      </div>
    </div>
  )
}
