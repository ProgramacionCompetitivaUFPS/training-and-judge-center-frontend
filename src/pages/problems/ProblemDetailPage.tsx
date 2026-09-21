import { useParams, useNavigate } from 'react-router-dom'
import { Clock, HardDrive, User, Calendar, Trash2, Pencil, ArrowUpCircle, ArrowDownCircle, BarChart3, Send, Upload, X, RefreshCw, ClipboardCheck, HelpCircle, XCircle } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, SearchSelect, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { MarkdownRenderer } from '@/components/features/MarkdownRenderer'
import { useContestSession } from '@/hooks/useContestSession'
import { useToastContext } from '@/hooks/useToastContext'
import {
  useProblemDetail,
  useProblemStatistics,
  usePublishProblem,
  useUnpublishProblem,
  useDeleteProblem,
  useUploadProblemFile,
  useDeleteProblemFile,
  useAddModifier,
  useRemoveModifier,
  useAdminRejudgeProblem,
} from '@/hooks/api/useProblems'
import { useAuth } from '@/hooks/useAuth'
import { useRejudgeContestProblem } from '@/hooks/api/useContests'
import { useGroupDetail } from '@/hooks/api/useGroups'
import { useSearchUsers } from '@/hooks/api/useUsers'
import { useDebounce } from '@/hooks/useDebounce'
import { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { SUBMISSION_STATUS_CONFIG, PATHS, PROBLEM_FILE_TYPE_INFO } from '@/lib/constants'
import { ApiClientError } from '@/lib/errors'
import { exceedsZipStructureCheckSize, peekZipEntryPaths } from '@/lib/zipPeek'
import type { ProblemDetail, PublishFailureResponse, ValidationSummary } from '@/types/problem'

interface PublishRequirement { key: string; label: string; met: (problem: ProblemDetail) => boolean }

// Mirrors the backend's requiredFieldsForPublish (checker/validator are optional there,
// so they're intentionally left out here too). `key` matches the strings the backend sends
// back in a failed publish response's `missingFields` (see PublishFailureResponse).
const PUBLISH_REQUIREMENTS: PublishRequirement[] = [
  { key: 'statement', label: 'Enunciado', met: (p) => !!p.statement },
  { key: 'timeLimit', label: 'Límite de tiempo', met: (p) => p.timeLimit != null },
  { key: 'memoryLimit', label: 'Límite de memoria', met: (p) => p.memoryLimit != null },
  { key: 'testCases', label: 'Casos de prueba', met: (p) => !!p.files?.testCases },
  { key: 'solution', label: 'Al menos una solución', met: (p) => (p.files?.solutions.length ?? 0) > 0 },
]

function publishRequirementLabel(fieldKey: string): string {
  return PUBLISH_REQUIREMENTS.find((r) => r.key === fieldKey)?.label ?? fieldKey
}

export function ProblemDetailPage() {
  const { slug, groupId, contestId, letter } = useParams<{ slug: string; groupId?: string; contestId?: string; letter?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { contest: activeContest, isLoading: isContestLoading } = useContestSession()
  const { toast } = useToastContext()

  const isContestContext = !!contestId
  const isContestActive = isContestContext && activeContest?.status === 'ACTIVE'
  const resolvedSlug = isContestContext
    ? activeContest?.problems.find(
        (p) => ('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[p.position - 1] || String(p.position)) === letter?.toUpperCase()
      )?.slug
    : slug

  const { data: problem, isLoading, error } = useProblemDetail(resolvedSlug || '')
  const { data: stats } = useProblemStatistics(resolvedSlug || '')
  const { data: contestGroup } = useGroupDetail(isContestContext ? groupId || '' : '')
  const publishMutation = usePublishProblem()
  const unpublishMutation = useUnpublishProblem()
  const deleteMutation = useDeleteProblem()
  const adminRejudgeMutation = useAdminRejudgeProblem()
  const rejudgeContestMutation = useRejudgeContestProblem()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmSlug, setConfirmSlug] = useState('')
  const [adminRejudgeDialogOpen, setAdminRejudgeDialogOpen] = useState(false)
  const [contestRejudgeDialogOpen, setContestRejudgeDialogOpen] = useState(false)
  const [publishResult, setPublishResult] = useState<
    | { kind: 'success'; validationLogs: string[]; validationSummary?: ValidationSummary }
    | { kind: 'failure'; data: PublishFailureResponse }
    | null
  >(null)

  if (isLoading || (isContestContext && (isContestLoading || !resolvedSlug))) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Problemas', href: '/problems' }, { label: '...' }]}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    )
  }

  if (error || !problem) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Problemas', href: '/problems' }, { label: 'Error' }]}>
        <div className="text-center py-12 text-neutral-text-muted">
          Problema no encontrado
        </div>
      </AppLayout>
    )
  }

  const isAdmin = user?.role === 'ADMIN'
  const isModifier = problem.modifiers?.some((m) => m.nickname === user?.nickname)
  const canEdit = isAdmin || isModifier
  const canDelete = isAdmin || problem.author.nickname === user?.nickname
  const canSeeManagement = user?.role === 'ADMIN' || user?.role === 'COACH'
  // Real leadership of the contest's group, or ownership of the contest itself — the two
  // identities the backend's contest-scoped rejudge endpoint actually accepts (same rule as
  // ContestDetailPage.tsx). An Admin who is neither still sees the button (manual grants
  // Admin access too) but must be routed to the admin rejudge endpoint instead — see
  // handleContestRejudge.
  const isContestOwnerOrLead =
    contestGroup?.userMembership.role === 'LEAD' || activeContest?.owner.nickname === user?.nickname
  const isContestLead = isAdmin || isContestOwnerOrLead
  const missingPublishRequirements = PUBLISH_REQUIREMENTS.filter((r) => !r.met(problem))

  function handlePublish() {
    if (!problem) return
    publishMutation.mutate(problem.slug, {
      onSuccess: (data) => {
        toast({ variant: 'success', title: 'Problema publicado' })
        if (data.validationLogs?.length) {
          setPublishResult({ kind: 'success', validationLogs: data.validationLogs, validationSummary: data.validationSummary })
        }
      },
      onError: (err) => {
        if (err instanceof ApiClientError && err.code === 'VALIDATION_FAILED' && err.raw) {
          toast({ variant: 'error', title: 'No se pudo publicar', description: 'Revisa el detalle de la validación.' })
          setPublishResult({ kind: 'failure', data: err.raw as PublishFailureResponse })
        } else {
          toast({ variant: 'error', title: 'Error al publicar', description: err instanceof ApiClientError ? err.message : undefined })
        }
      },
    })
  }

  function handleUnpublish() {
    if (!problem) return
    unpublishMutation.mutate(problem.slug, {
      onSuccess: () => toast({ variant: 'success', title: 'Problema despublicado' }),
      onError: (err) => {
        if (err instanceof ApiClientError && err.code === 'PROBLEM_IN_ACTIVE_CONTEST') {
          toast({ variant: 'error', title: 'No se puede despublicar', description: 'Este problema está siendo usado en una competencia activa en este momento.' })
        } else {
          toast({ variant: 'error', title: 'Error al despublicar' })
        }
      },
    })
  }

  function handleDelete() {
    if (!problem || confirmSlug !== problem.slug) return
    deleteMutation.mutate(
      { slug: problem.slug, data: { confirmSlug } },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Problema eliminado' })
          navigate('/problems')
        },
        onError: (err) => {
          if (err instanceof ApiClientError && err.code === 'PROBLEM_IN_ACTIVE_CONTEST') {
            toast({ variant: 'error', title: 'No se puede eliminar', description: 'Este problema está siendo usado en una competencia activa en este momento.' })
          } else {
            toast({ variant: 'error', title: 'Error al eliminar' })
          }
        },
      },
    )
  }

  function handleAdminRejudge() {
    if (!problem) return
    adminRejudgeMutation.mutate(
      { slug: problem.slug },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Rejuzgamiento global iniciado', description: 'Se están rejuzgando todos los envíos de este problema.' }),
        onError: () => toast({ variant: 'error', title: 'Error al rejuzgar' }),
      },
    )
    setAdminRejudgeDialogOpen(false)
  }

  function handleContestRejudge() {
    if (!problem || !groupId || !contestId) return
    const onSettled = {
      onSuccess: () => toast({ variant: 'success', title: 'Rejuzgamiento iniciado', description: 'Se están rejuzgando los envíos de este problema en la competencia.' }),
      onError: () => toast({ variant: 'error', title: 'Error al rejuzgar' }),
    }
    // An Admin who isn't the contest's owner/lead is rejected by the contest-scoped endpoint
    // (RejudgeContestSubmissionsUseCase only accepts owner/lead) — the admin endpoint with
    // ?contestId= is the one designed for that case (see PRB-09 in docs/seguimiento).
    if (isContestOwnerOrLead) {
      rejudgeContestMutation.mutate({ groupId, contestId, problemSlug: problem.slug }, onSettled)
    } else {
      adminRejudgeMutation.mutate({ slug: problem.slug, contestId }, onSettled)
    }
    setContestRejudgeDialogOpen(false)
  }

  const breadcrumbs = contestId
    ? [
        { label: 'Competencias', href: '/contests' },
        { label: activeContest?.name || 'Contest', href: PATHS.contest(groupId || '', contestId || '') },
        { label: `Problema ${letter?.toUpperCase() || ''}` },
      ]
    : [
        { label: 'Problemas', href: '/problems' },
        { label: problem.title },
      ]

  return (
    <TooltipProvider>
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* === Left Column: Content === */}
        <div className="space-y-6 min-w-0">
          {/* Tags above title — hidden during active contest to prevent spoilers */}
          {!isContestActive && problem.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {problem.tags.map((tag) => (
                <Badge key={tag} variant="default" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Title + badges */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-extrabold text-neutral-text-primary">
                {isContestContext && letter && `${letter.toUpperCase()}. `}{problem.title}
              </h1>
              {!isContestContext && canSeeManagement && (
                <>
                  <Badge variant={problem.status === 'PUBLISHED' ? 'success' : 'default'}>
                    {problem.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                  </Badge>
                  <Badge variant={problem.accessibility === 'PUBLIC' ? 'primary' : 'outline'}>
                    {problem.accessibility === 'PUBLIC' ? 'Público' : 'Privado'}
                  </Badge>
                </>
              )}
              {/* Letter badge removed — letter is now prefixed in the title */}
            </div>
            {!isContestContext && (
              <p className="text-sm text-neutral-text-muted font-mono">{problem.slug}</p>
            )}
          </div>

          {/* Statement — the "Enunciado" label is only useful while reviewing a draft
              alongside the Archivos/Gestión cards; once published, this is the only thing
              on the page and a contestant is just here to read the problem, so the label
              would be redundant chrome. */}
          <Card>
            {problem.status !== 'PUBLISHED' && (
              <CardHeader>
                <CardTitle>Enunciado</CardTitle>
              </CardHeader>
            )}
            <CardContent className={problem.status === 'PUBLISHED' ? 'pt-6' : undefined}>
              {problem.statement ? (
                <MarkdownRenderer content={problem.statement} />
              ) : (
                <p className="text-neutral-text-muted italic">Sin enunciado aún</p>
              )}
            </CardContent>
          </Card>

          {/* Examples — derived automatically from the data/sample/ test-case files (GetProblem's
              `samples` field), not authored by hand, so they can't drift from what's actually judged. */}
          {problem.samples.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ejemplos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {problem.samples.map((sample, index) => (
                  <div key={sample.name} className="border border-neutral-border rounded-lg overflow-hidden">
                    <div className="bg-neutral-background px-4 py-2 border-b border-neutral-border">
                      <span className="text-xs font-bold text-neutral-text-muted uppercase tracking-wider">Ejemplo {index + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-border">
                      <div className="p-4">
                        <span className="block mb-2 text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Entrada</span>
                        <pre className="font-mono text-sm text-neutral-text-primary whitespace-pre bg-neutral-background rounded-md p-3 overflow-x-auto">{sample.input}</pre>
                      </div>
                      <div className="p-4">
                        <span className="block mb-2 text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Salida</span>
                        <pre className="font-mono text-sm text-neutral-text-primary whitespace-pre bg-neutral-background rounded-md p-3 overflow-x-auto">{sample.output}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Files (only for modifiers, and only while the problem is still a draft — the
              backend rejects uploads to a published problem) */}
          {canEdit && problem.files && problem.status !== 'PUBLISHED' && (
            <FilesManager problem={problem} />
          )}

          {/* Modifiers (only for modifiers) */}
          {canEdit && (
            <ModifiersManager problem={problem} canSearchUsers={user?.role === 'ADMIN' || user?.role === 'COACH'} />
          )}
        </div>

        {/* === Right Column: Sidebar === */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          {/* Submit action */}
          {problem.status === 'PUBLISHED' && (
            <Card>
              <CardContent className="pt-6">
                <Button
                  variant="primary"
                  className="w-full gap-2"
                  onClick={() => {
                    if (isContestContext && groupId && contestId && letter) {
                      navigate(PATHS.contestSubmit(groupId, contestId, letter.toUpperCase()))
                    } else {
                      navigate(`/submit?problem=${problem.slug}`)
                    }
                  }}
                >
                  <Send className="h-4 w-4" />
                  Enviar solución
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 mt-2"
                  onClick={() => navigate(PATHS.problemSubmissions(problem.slug))}
                >
                  <BarChart3 className="h-4 w-4" />
                  Ver submissions
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Technical metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-widest text-neutral-text-muted">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MetadataRow icon={User} label="Autor" value={problem.author.name} />
              <MetadataRow icon={Clock} label="Tiempo límite" value={problem.timeLimit ? `${problem.timeLimit} ms` : 'No definido'} />
              <MetadataRow icon={HardDrive} label="Memoria" value={problem.memoryLimit ? `${problem.memoryLimit} MiB` : 'No definido'} />
              {problem.languageOverrides.length > 0 && (
                <div className="pt-2 mt-2 border-t border-neutral-border">
                  <p className="text-[10px] font-bold text-neutral-text-muted uppercase tracking-wider mb-2">Overrides por lenguaje</p>
                  <div className="space-y-1.5">
                    {problem.languageOverrides.map((lo) => (
                      <div key={lo.language} className="flex items-center justify-between text-xs">
                        <Badge variant="outline" className="text-[10px] py-0">{lo.language}</Badge>
                        <span className="text-neutral-text-muted font-mono">
                          {[lo.timeLimit && `${lo.timeLimit}ms`, lo.memoryLimit && `${lo.memoryLimit}MiB`].filter(Boolean).join(' / ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <MetadataRow icon={Calendar} label="Creado" value={new Date(problem.createdAt).toLocaleDateString('es')} />
            </CardContent>
          </Card>

          {/* Statistics — hidden during active contest */}
          {!isContestActive && stats && stats.totalSubmissions > 0 && stats.uniqueUsers && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-widest text-neutral-text-muted flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Estadísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-neutral-text-primary">{stats.totalSubmissions}</div>
                    <div className="text-[10px] text-neutral-text-muted">Envíos</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-neutral-text-primary">{stats.uniqueUsers.attempted}</div>
                    <div className="text-[10px] text-neutral-text-muted">Intentaron</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-status-success">{stats.uniqueUsers.solved}</div>
                    <div className="text-[10px] text-neutral-text-muted">Resolvieron</div>
                  </div>
                </div>

                {/* Success rate bar */}
                {stats.uniqueUsers.attempted > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-neutral-text-muted">Tasa de éxito</span>
                      <span className="font-mono font-bold">
                        {Math.round((stats.uniqueUsers.solved / stats.uniqueUsers.attempted) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-neutral-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-status-success rounded-full"
                        style={{ width: `${Math.round((stats.uniqueUsers.solved / stats.uniqueUsers.attempted) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Verdict distribution */}
                {stats.verdictDistribution && (
                  <div className="pt-3 border-t border-neutral-border">
                    <h4 className="text-[10px] font-bold text-neutral-text-muted uppercase tracking-wider mb-2">Veredictos</h4>
                    <div className="space-y-1.5">
                      {stats.verdictDistribution.map((v) => {
                        const config = SUBMISSION_STATUS_CONFIG[v.verdict as keyof typeof SUBMISSION_STATUS_CONFIG]
                        const pct = Math.round((v.count / stats.totalSubmissions) * 100)
                        return (
                          <div key={v.verdict} className="flex items-center gap-2 text-xs">
                            <span className="w-20 truncate text-neutral-text-muted">{config?.label || v.verdict}</span>
                            <div className="flex-1 h-1 bg-neutral-surface rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  v.verdict === 'ACCEPTED' ? 'bg-status-success' :
                                  v.verdict === 'WRONG_ANSWER' || v.verdict === 'RUNTIME_EXCEPTION' ? 'bg-status-error' :
                                  'bg-status-warning'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-8 text-right font-mono text-neutral-text-muted">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Acceptance by language */}
                {stats.acceptanceRateByLanguage && (
                  <div className="pt-3 border-t border-neutral-border">
                    <h4 className="text-[10px] font-bold text-neutral-text-muted uppercase tracking-wider mb-2">Por lenguaje</h4>
                    <div className="space-y-2">
                      {stats.acceptanceRateByLanguage.map((lang) => {
                        const rate = lang.usersAttempted > 0 ? Math.round((lang.usersAccepted / lang.usersAttempted) * 100) : 0
                        return (
                          <div key={lang.language} className="flex items-center justify-between text-xs">
                            <span className="font-mono">{lang.language}</span>
                            <span className="font-bold text-brand-primary">{rate}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Management actions (only for editors) */}
          {canEdit && !isContestContext && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-widest text-neutral-text-muted">Gestión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {problem.status === 'DRAFT' && (
                  missingPublishRequirements.length > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0} className="block">
                          <Button variant="primary" className="w-full gap-2" disabled>
                            <ArrowUpCircle className="h-4 w-4" />
                            Publicar
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold text-neutral-text-primary">Falta completar antes de publicar:</p>
                        <ul className="mt-1 list-disc list-inside">
                          {missingPublishRequirements.map((r) => <li key={r.label}>{r.label}</li>)}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button variant="primary" className="w-full gap-2" onClick={handlePublish} isLoading={publishMutation.isPending}>
                      <ArrowUpCircle className="h-4 w-4" />
                      Publicar
                    </Button>
                  )
                )}
                {problem.status === 'PUBLISHED' && (
                  <Button variant="outline" className="w-full gap-2" onClick={handleUnpublish} isLoading={unpublishMutation.isPending}>
                    <ArrowDownCircle className="h-4 w-4" />
                    Despublicar
                  </Button>
                )}
                <Button variant="outline" className="w-full gap-2" onClick={() => navigate(PATHS.problemEdit(problem.slug))}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                {isAdmin && (
                  <Button variant="outline" className="w-full gap-2" onClick={() => setAdminRejudgeDialogOpen(true)} isLoading={adminRejudgeMutation.isPending}>
                    <RefreshCw className="h-4 w-4" />
                    Rejuzgar (global)
                  </Button>
                )}
                {canDelete && (
                  <Button variant="danger" className="w-full gap-2" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contest-scoped rejudge (only within a contest, for the group's real leads, the
              contest's owner, or Admin — see handleContestRejudge for the endpoint routing) */}
          {isContestContext && isContestLead && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-widest text-neutral-text-muted">Gestión de la competencia</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setContestRejudgeDialogOpen(true)}
                  isLoading={rejudgeContestMutation.isPending || adminRejudgeMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4" />
                  Rejuzgar envíos
                </Button>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {/* Admin rejudge (global) confirm dialog */}
      <ConfirmDialog
        open={adminRejudgeDialogOpen}
        onOpenChange={setAdminRejudgeDialogOpen}
        title="Rejuzgar en toda la plataforma"
        description="Esta acción reevalúa todos los envíos de este problema en todas las competencias y en modo práctica. Puede tardar según la cantidad de envíos."
        variant="warning"
        confirmLabel="Rejuzgar"
        onConfirm={handleAdminRejudge}
        isLoading={adminRejudgeMutation.isPending}
      />

      {/* Contest rejudge confirm dialog */}
      <ConfirmDialog
        open={contestRejudgeDialogOpen}
        onOpenChange={setContestRejudgeDialogOpen}
        title="Rejuzgar envíos de este problema"
        description="Esta acción reevalúa todos los envíos afectados de este problema dentro de esta competencia."
        variant="warning"
        confirmLabel="Rejuzgar"
        onConfirm={handleContestRejudge}
        isLoading={rejudgeContestMutation.isPending || adminRejudgeMutation.isPending}
      />

      {/* Publish validation result — success (validation logs) or failure (real detail from
          the backend: missing fields, failed test cases, compilation errors, rejected inputs) */}
      <Dialog open={!!publishResult} onOpenChange={(open) => !open && setPublishResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {publishResult?.kind === 'failure' ? (
                <>
                  <XCircle className="h-5 w-5 text-status-error" />
                  No se pudo publicar
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-5 w-5 text-status-success" />
                  Detalle de la validación
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {publishResult?.kind === 'success' && (
            <ul className="space-y-2">
              {publishResult.validationLogs.map((log, i) => (
                <li key={i} className="text-sm text-neutral-text-primary">{log}</li>
              ))}
            </ul>
          )}

          {publishResult?.kind === 'failure' && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-text-primary">{publishResult.data.message}</p>

              {!!publishResult.data.missingFields?.length && (
                <div>
                  <p className="text-sm font-semibold text-neutral-text-primary">Faltan campos requeridos:</p>
                  <ul className="mt-1 list-disc list-inside text-sm text-neutral-text-primary">
                    {publishResult.data.missingFields.map((field) => (
                      <li key={field}>{publishRequirementLabel(field)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {publishResult.data.compilationErrors && (
                <div>
                  <p className="text-sm font-semibold text-neutral-text-primary">
                    Error de compilación en <span className="font-mono">{publishResult.data.compilationErrors.file}</span>:
                  </p>
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-neutral-background p-2 font-mono text-xs text-neutral-text-primary">
                    {publishResult.data.compilationErrors.errors.join('\n')}
                  </pre>
                </div>
              )}

              {!!publishResult.data.failedTestCases?.length && (
                <div>
                  <p className="text-sm font-semibold text-neutral-text-primary">Casos de prueba fallidos:</p>
                  <ul className="mt-1 space-y-1 text-sm text-neutral-text-primary">
                    {publishResult.data.failedTestCases.map((tc) => (
                      <li key={tc.case}>
                        <span className="font-mono">{tc.case}</span>
                        {(tc.status || tc.verdict) && <span className="text-neutral-text-muted"> — {tc.status || tc.verdict}</span>}
                        {tc.details && <span className="block text-xs text-neutral-text-muted">{tc.details}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!!publishResult.data.failedInputs?.length && (
                <div>
                  <p className="text-sm font-semibold text-neutral-text-primary">Entradas rechazadas por el validator:</p>
                  <ul className="mt-1 space-y-1 text-sm text-neutral-text-primary">
                    {publishResult.data.failedInputs.map((fi) => (
                      <li key={fi.file}><span className="font-mono">{fi.file}</span>: {fi.reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!!publishResult.data.validationLogs?.length && (
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-neutral-text-primary">Ver logs completos</summary>
                  <ul className="mt-2 space-y-1">
                    {publishResult.data.validationLogs.map((log, i) => (
                      <li key={i} className="text-sm text-neutral-text-primary">{log}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setPublishResult(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar problema</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Escribe <span className="font-mono font-semibold">{problem.slug}</span> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <Input
            label="Confirmar slug"
            value={confirmSlug}
            onChange={(e) => setConfirmSlug(e.target.value)}
            placeholder={problem.slug}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
              disabled={confirmSlug !== problem.slug}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
    </TooltipProvider>
  )
}

// === Sub-components ===

interface MetadataRowProps { icon: React.ElementType; label: string; value: string }

function MetadataRow({ icon: Icon, label, value }: MetadataRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-neutral-text-muted">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>{label}</span>
      </div>
      <span className="font-medium text-neutral-text-primary">{value}</span>
    </div>
  )
}

type ProblemFileType = keyof typeof PROBLEM_FILE_TYPE_INFO

// Cheap sanity check, not a replacement for the backend's real parser (icpc_parser.go):
// only confirms the two required folders exist somewhere in the archive, without
// validating .in/.ans pairing, file sizes, or the exact ICPC root-detection rules —
// that stays the backend's job so the two don't drift out of sync.
async function checkTestCasesZipStructure(file: File): Promise<string | null> {
  const paths = await peekZipEntryPaths(file)
  if (!paths) return 'El archivo no se pudo leer como un ZIP válido.'
  const hasSample = paths.some((p) => p.includes('data/sample/'))
  const hasSecret = paths.some((p) => p.includes('data/secret/'))
  if (!hasSample || !hasSecret) {
    return 'El ZIP debe contener las carpetas data/sample/ y data/secret/ con los casos de prueba.'
  }
  return null
}

interface FilesManagerProps { problem: ProblemDetail }

function FilesManager({ problem }: FilesManagerProps) {
  const uploadMutation = useUploadProblemFile()
  const deleteMutation = useDeleteProblemFile()
  const { toast } = useToastContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFileType, setPendingFileType] = useState<ProblemFileType | null>(null)
  const [isCheckingZip, setIsCheckingZip] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ fileType: string; fileName?: string; label: string } | null>(null)

  if (!problem.files) return null
  const files = problem.files

  function triggerUpload(fileType: ProblemFileType) {
    setPendingFileType(fileType)
    if (fileInputRef.current) fileInputRef.current.accept = PROBLEM_FILE_TYPE_INFO[fileType].accept
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !pendingFileType) return

    const info = PROBLEM_FILE_TYPE_INFO[pendingFileType]
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!(info.extensions as readonly string[]).includes(extension)) {
      toast({
        variant: 'error',
        title: 'Formato de archivo incorrecto',
        description: `${info.label} espera ${info.extensions.join(' o ')}. ${info.help}`,
      })
      setPendingFileType(null)
      return
    }

    if (pendingFileType === 'testCases' && !exceedsZipStructureCheckSize(file)) {
      setIsCheckingZip(true)
      const structureError = await checkTestCasesZipStructure(file)
      setIsCheckingZip(false)
      if (structureError) {
        toast({ variant: 'error', title: 'Estructura del ZIP incorrecta', description: structureError })
        setPendingFileType(null)
        return
      }
    }

    uploadMutation.mutate(
      { slug: problem.slug, fileType: pendingFileType, file },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Archivo subido' }),
        onError: (err) => {
          if (err instanceof ApiClientError && err.code === 'PROBLEM_IS_PUBLISHED') {
            toast({ variant: 'error', title: 'No se puede subir el archivo', description: 'Este problema está publicado. Despublícalo primero para modificar sus archivos.' })
          } else if (err instanceof ApiClientError) {
            toast({ variant: 'error', title: 'Error al subir el archivo', description: err.message })
          } else {
            toast({ variant: 'error', title: 'Error al subir el archivo' })
          }
        },
      },
    )
    setPendingFileType(null)
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteMutation.mutate(
      { slug: problem.slug, fileType: deleteTarget.fileType, fileName: deleteTarget.fileName },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Archivo eliminado' }),
        onError: (err) => {
          if (err instanceof ApiClientError && err.code === 'PROBLEM_IS_PUBLISHED') {
            toast({ variant: 'error', title: 'No se puede eliminar el archivo', description: 'Este problema está publicado. Despublícalo primero para modificar sus archivos.' })
          } else {
            toast({ variant: 'error', title: 'Error al eliminar el archivo' })
          }
        },
      },
    )
    setDeleteTarget(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Archivos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

        {(['testCases', 'checker', 'validator'] as const).map((fileType) => (
          <div key={fileType} className="flex items-center justify-between text-sm py-1">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${files[fileType] ? 'bg-status-success' : 'bg-neutral-border'}`} />
              <span className="text-neutral-text-primary inline-flex items-center gap-1">
                {PROBLEM_FILE_TYPE_INFO[fileType].label}
                <FileFormatHint fileType={fileType} />
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => triggerUpload(fileType)}
                isLoading={(uploadMutation.isPending || isCheckingZip) && pendingFileType === fileType}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                {files[fileType] ? 'Reemplazar' : 'Subir'}
              </Button>
              {files[fileType] && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ fileType, label: PROBLEM_FILE_TYPE_INFO[fileType].label })}
                  className="p-1 rounded hover:bg-status-error/10 text-neutral-text-muted hover:text-status-error transition-colors"
                  aria-label={`Eliminar ${PROBLEM_FILE_TYPE_INFO[fileType].label}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="pt-2 border-t border-neutral-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-neutral-text-primary font-medium inline-flex items-center gap-1">
              Soluciones
              <FileFormatHint fileType="solution" />
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => triggerUpload('solution')}
              isLoading={uploadMutation.isPending && pendingFileType === 'solution'}
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              Agregar
            </Button>
          </div>
          {files.solutions.length === 0 ? (
            <p className="text-xs text-neutral-text-muted">Sin soluciones cargadas.</p>
          ) : (
            <ul className="space-y-1">
              {files.solutions.map((sol) => (
                <li key={sol.filename} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-text-muted font-mono text-xs">{sol.filename}</span>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ fileType: 'solution', fileName: sol.filename, label: sol.filename })}
                    className="p-1 rounded hover:bg-status-error/10 text-neutral-text-muted hover:text-status-error transition-colors"
                    aria-label={`Eliminar ${sol.filename}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar archivo"
        description={`¿Seguro que quieres eliminar "${deleteTarget?.label}"? Esta acción no se puede deshacer.`}
        variant="warning"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </Card>
  )
}

function FileFormatHint({ fileType }: { fileType: ProblemFileType }) {
  const info = PROBLEM_FILE_TYPE_INFO[fileType]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="align-super text-neutral-text-muted hover:text-brand-primary"
          aria-label={`Formato esperado para ${info.label}`}
        >
          <HelpCircle className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{info.help}</p>
        <pre className="mt-1.5 whitespace-pre-wrap rounded bg-neutral-background p-1.5 font-mono text-[11px] text-neutral-text-muted">
          {info.example}
        </pre>
      </TooltipContent>
    </Tooltip>
  )
}

interface ModifiersManagerProps { problem: ProblemDetail; canSearchUsers: boolean }

function ModifiersManager({ problem, canSearchUsers }: ModifiersManagerProps) {
  const addMutation = useAddModifier()
  const removeMutation = useRemoveModifier()
  const { toast } = useToastContext()
  const [userQuery, setUserQuery] = useState('')
  const debouncedUserQuery = useDebounce(userQuery)
  const { data: userSearchData, isFetching: isSearchingUsers } = useSearchUsers(debouncedUserQuery, undefined, canSearchUsers)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)

  const modifiers = problem.modifiers ?? []

  function handleAdd(targetNickname: string) {
    addMutation.mutate(
      { slug: problem.slug, userNickname: targetNickname },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Colaborador agregado' })
          setUserQuery('')
        },
        onError: () => toast({ variant: 'error', title: 'Error al agregar colaborador' }),
      },
    )
  }

  function handleRemoveConfirm() {
    if (!removeTarget) return
    removeMutation.mutate(
      { slug: problem.slug, nickname: removeTarget },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Colaborador removido' }),
        onError: () => toast({ variant: 'error', title: 'Error al remover colaborador' }),
      },
    )
    setRemoveTarget(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modificadores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SearchSelect
          query={userQuery}
          onQueryChange={setUserQuery}
          results={(userSearchData?.users ?? []).filter((u) => !modifiers.some((m) => m.nickname === u.nickname))}
          isSearching={isSearchingUsers}
          placeholder="Buscar usuario por nombre o nickname..."
          emptyLabel="Sin resultados (o ya es colaborador)"
          hintLabel="Escribe al menos 2 caracteres"
          getKey={(u) => u.id}
          renderItem={(u) => (
            <div>
              <p className="font-medium text-neutral-text-primary">{u.name}</p>
              <p className="text-xs text-neutral-text-muted">@{u.nickname}</p>
            </div>
          )}
          onSelect={(u) => handleAdd(u.nickname)}
        />
        {addMutation.isPending && <p className="text-xs text-neutral-text-muted">Agregando...</p>}
        {modifiers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {modifiers.map((m) => (
              <Badge key={m.nickname} variant="outline" className="gap-1 pr-1">
                {m.name} (@{m.nickname})
                <button
                  type="button"
                  onClick={() => setRemoveTarget(m.nickname)}
                  className="ml-1 p-0.5 rounded-full hover:bg-status-error/10 text-neutral-text-muted hover:text-status-error transition-colors"
                  aria-label={`Quitar a ${m.nickname}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Quitar colaborador"
        description={`¿Seguro que quieres quitar a @${removeTarget} como colaborador de este problema?`}
        variant="warning"
        onConfirm={handleRemoveConfirm}
        isLoading={removeMutation.isPending}
      />
    </Card>
  )
}

