import { useParams, useNavigate } from 'react-router-dom'
import { Clock, HardDrive, User, Calendar, Tag, Trash2, Pencil, ArrowUpCircle, ArrowDownCircle, BarChart3 } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { LatexRenderer } from '@/components/features/LatexRenderer'
import { useProblemDetail, useProblemStatistics, usePublishProblem, useUnpublishProblem, useDeleteProblem } from '@/hooks/api/useProblems'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/components/ui/ToastProvider'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { SUBMISSION_STATUS_CONFIG } from '@/lib/constants'

export function ProblemDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToastContext()

  const { data: problem, isLoading, error } = useProblemDetail(slug || '')
  const { data: stats } = useProblemStatistics(slug || '')
  const publishMutation = usePublishProblem()
  const unpublishMutation = useUnpublishProblem()
  const deleteMutation = useDeleteProblem()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmSlug, setConfirmSlug] = useState('')

  if (isLoading) {
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

  function handlePublish() {
    if (!problem) return
    publishMutation.mutate(problem.slug, {
      onSuccess: () => toast({ variant: 'success', title: 'Problema publicado' }),
      onError: () => toast({ variant: 'error', title: 'Error al publicar' }),
    })
  }

  function handleUnpublish() {
    if (!problem) return
    unpublishMutation.mutate(problem.slug, {
      onSuccess: () => toast({ variant: 'success', title: 'Problema despublicado' }),
      onError: () => toast({ variant: 'error', title: 'Error al despublicar' }),
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
        onError: () => toast({ variant: 'error', title: 'Error al eliminar' }),
      },
    )
  }

  const breadcrumbs = [
    { label: 'Problemas', href: '/problems' },
    { label: problem.title },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-neutral-text-primary">{problem.title}</h1>
              <Badge variant={problem.status === 'PUBLISHED' ? 'success' : 'default'}>
                {problem.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
              </Badge>
              <Badge variant={problem.accessibility === 'PUBLIC' ? 'primary' : 'outline'}>
                {problem.accessibility === 'PUBLIC' ? 'Público' : 'Privado'}
              </Badge>
            </div>
            <p className="text-sm text-neutral-text-muted font-mono">{problem.slug}</p>
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="flex items-center gap-2">
              {problem.status === 'DRAFT' && (
                <Button variant="primary" onClick={handlePublish} isLoading={publishMutation.isPending}>
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Publicar
                </Button>
              )}
              {problem.status === 'PUBLISHED' && (
                <Button variant="outline" onClick={handleUnpublish} isLoading={unpublishMutation.isPending}>
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  Despublicar
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate(`/problems/${problem.slug}/edit`)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              {canDelete && (
                <Button variant="danger" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetadataItem icon={User} label="Autor" value={problem.author.name} />
          <MetadataItem icon={Clock} label="Tiempo límite" value={problem.timeLimit ? `${problem.timeLimit} ms` : 'No definido'} />
          <MetadataItem icon={HardDrive} label="Memoria límite" value={problem.memoryLimit ? `${problem.memoryLimit} MiB` : 'No definido'} />
          <MetadataItem icon={Calendar} label="Creado" value={new Date(problem.createdAt).toLocaleDateString('es')} />
        </div>

        {/* Tags */}
        {problem.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-4 w-4 text-neutral-text-muted" />
            {problem.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Statement */}
        <Card>
          <CardHeader>
            <CardTitle>Enunciado</CardTitle>
          </CardHeader>
          <CardContent>
            {problem.statement ? (
              <LatexRenderer
                content={problem.statement}
                className="prose prose-sm max-w-none text-neutral-text-primary"
              />
            ) : (
              <p className="text-neutral-text-muted italic">Sin enunciado aún</p>
            )}
          </CardContent>
        </Card>

        {/* Language overrides */}
        {problem.languageOverrides.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Límites por lenguaje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {problem.languageOverrides.map((lo) => (
                  <div key={lo.language} className="flex items-center gap-4 text-sm">
                    <Badge variant="outline">{lo.language}</Badge>
                    {lo.timeLimit && <span>Tiempo: {lo.timeLimit} ms</span>}
                    {lo.memoryLimit && <span>Memoria: {lo.memoryLimit} MiB</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Files (only for modifiers) */}
        {problem.files && (
          <Card>
            <CardHeader>
              <CardTitle>Archivos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <FileIndicator label="Test cases" available={problem.files.testCases} />
                <FileIndicator label="Soluciones" available={problem.files.solutions.length > 0} detail={problem.files.solutions.length > 0 ? problem.files.solutions.join(', ') : undefined} />
                <FileIndicator label="Checker" available={problem.files.checker} />
                <FileIndicator label="Validator" available={problem.files.validator} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modifiers (only for modifiers) */}
        {problem.modifiers && problem.modifiers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Modificadores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {problem.modifiers.map((m) => (
                  <Badge key={m.nickname} variant="outline">
                    {m.name} (@{m.nickname})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        {stats && stats.totalSubmissions > 0 && stats.uniqueUsers && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Estadísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-neutral-text-primary">{stats.totalSubmissions}</div>
                  <div className="text-xs text-neutral-text-muted">Submissions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-neutral-text-primary">{stats.uniqueUsers.attempted}</div>
                  <div className="text-xs text-neutral-text-muted">Intentaron</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-status-success">{stats.uniqueUsers.solved}</div>
                  <div className="text-xs text-neutral-text-muted">Resolvieron</div>
                </div>
              </div>

              {/* Verdict distribution */}
              {stats.verdictDistribution && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-text-primary mb-2">Distribución de veredictos</h4>
                  <div className="space-y-1">
                    {stats.verdictDistribution.map((v) => {
                      const config = SUBMISSION_STATUS_CONFIG[v.verdict as keyof typeof SUBMISSION_STATUS_CONFIG]
                      const pct = Math.round((v.count / stats.totalSubmissions) * 100)
                      return (
                        <div key={v.verdict} className="flex items-center gap-2 text-sm">
                          <span className="w-40 truncate">{config?.label || v.verdict}</span>
                          <div className="flex-1 h-2 bg-neutral-surface rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                v.verdict === 'ACCEPTED' ? 'bg-status-success' :
                                v.verdict === 'WRONG_ANSWER' || v.verdict === 'RUNTIME_EXCEPTION' ? 'bg-status-error' :
                                'bg-status-warning'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-neutral-text-muted">{v.count} ({pct}%)</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Acceptance by language */}
              {stats.acceptanceRateByLanguage && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-text-primary mb-2">Aceptación por lenguaje</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {stats.acceptanceRateByLanguage.map((lang) => {
                      const rate = lang.usersAttempted > 0 ? Math.round((lang.usersAccepted / lang.usersAttempted) * 100) : 0
                      return (
                        <div key={lang.language} className="bg-neutral-surface rounded-lg p-3 text-center">
                          <div className="font-mono text-sm mb-1">{lang.language}</div>
                          <div className="text-lg font-semibold text-brand-primary">{rate}%</div>
                          <div className="text-xs text-neutral-text-muted">{lang.usersAccepted}/{lang.usersAttempted} usuarios</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

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
  )
}

// === Sub-components ===

function MetadataItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
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

function FileIndicator({ label, available, detail }: { label: string; available: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${available ? 'bg-status-success' : 'bg-neutral-border'}`} />
      <div>
        <div className="text-neutral-text-primary">{label}</div>
        {detail && <div className="text-xs text-neutral-text-muted">{detail}</div>}
      </div>
    </div>
  )
}
