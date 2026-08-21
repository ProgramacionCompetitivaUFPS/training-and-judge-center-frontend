import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Clock, HardDrive, Calendar, Code2, Eye, EyeOff, Download, ArrowLeft, RefreshCw, Puzzle } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import { BlocklySvgViewer } from '@/components/features/BlocklySvgViewer'
import { useSubmissionDetail, useUpdateSubmissionVisibility, useRejudgeSubmission, useAdminRejudgeSubmission } from '@/hooks/api/useSubmissions'
import { downloadSubmissionBlob } from '@/api/submissions'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/hooks/useToastContext'
import { PROGRAMMING_LANGUAGES, PATHS } from '@/lib/constants'

export function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToastContext()

  const [showBlocklyCode, setShowBlocklyCode] = useState(false)

  const { data: submission, isLoading, error } = useSubmissionDetail(id || '')
  const visibilityMutation = useUpdateSubmissionVisibility()
  const ownRejudgeMutation = useRejudgeSubmission()
  const adminRejudgeMutation = useAdminRejudgeSubmission()

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Submissions', href: '/submissions' }, { label: '...' }]}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    )
  }

  if (error || !submission) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Submissions', href: '/submissions' }, { label: 'Error' }]}>
        <div className="text-center py-12 text-neutral-text-muted">
          Submission no encontrada
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
        onSuccess: () => toast({ variant: 'success', title: `Visibilidad cambiada a ${newVisibility}` }),
        onError: () => toast({ variant: 'error', title: 'Error al cambiar visibilidad' }),
      },
    )
  }

  function handleDownload() {
    if (!submission) return
    const ext = submission.language === 'cpp20' ? 'cpp' : submission.language === 'java17' ? 'java' : 'py'
    const filename = `${submission.submittedBy.nickname}_${submission.id.slice(0, 8)}.${ext}`
    downloadSubmissionBlob(submission.sourceCode, filename)
  }

  function handleRejudge() {
    if (!submission) return
    const mutation = isAdmin ? adminRejudgeMutation : ownRejudgeMutation
    mutation.mutate(submission.id, {
      onSuccess: () => toast({ variant: 'success', title: 'Submission enviada a rejuzgar' }),
      onError: () => toast({ variant: 'error', title: 'Error al rejuzgar submission' }),
    })
  }

  const breadcrumbs = [
    { label: 'Submissions', href: '/submissions' },
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
                Submission #{submission.id.slice(0, 8)}
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
                  <span>Contest: {submission.contest.name}</span>
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
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
            <Button variant="ghost" onClick={() => navigate('/submissions')}>
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
            value={submission.memoryUsed != null ? `${submission.memoryUsed} MiB` : '—'}
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
                    <pre className="bg-neutral-surface rounded-lg p-4 overflow-x-auto text-sm font-mono text-neutral-text-primary leading-relaxed">
                      <code>{submission.sourceCode}</code>
                    </pre>
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
                <pre className="bg-neutral-surface rounded-lg p-4 overflow-x-auto text-sm font-mono text-neutral-text-primary leading-relaxed">
                  <code>{submission.sourceCode}</code>
                </pre>
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
