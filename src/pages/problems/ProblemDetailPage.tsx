import { useParams, useNavigate } from 'react-router-dom'
import { Clock, HardDrive, User, Calendar, Trash2, Pencil, ArrowUpCircle, ArrowDownCircle, BarChart3, Send, Copy, Check } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { MarkdownRenderer } from '@/components/features/MarkdownRenderer'
import { useContestSession } from '@/hooks/useContestSession'
import { useToastContext } from '@/hooks/useToastContext'
import { useProblemDetail, useProblemStatistics, usePublishProblem, useUnpublishProblem, useDeleteProblem } from '@/hooks/api/useProblems'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { SUBMISSION_STATUS_CONFIG } from '@/lib/constants'

export function ProblemDetailPage() {
  const { slug, contestId, letter } = useParams<{ slug: string; contestId?: string; letter?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { contest: activeContest, isLoading: isContestLoading } = useContestSession()
  const { toast } = useToastContext()

  const isContestContext = !!contestId
  const resolvedSlug = isContestContext
    ? activeContest?.problems.find(
        (p) => ('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[p.position - 1] || String(p.position)) === letter?.toUpperCase()
      )?.slug
    : slug

  const { data: problem, isLoading, error } = useProblemDetail(resolvedSlug || '')
  const { data: stats } = useProblemStatistics(resolvedSlug || '')
  const publishMutation = usePublishProblem()
  const unpublishMutation = useUnpublishProblem()
  const deleteMutation = useDeleteProblem()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmSlug, setConfirmSlug] = useState('')

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

  const breadcrumbs = contestId
    ? [
        { label: 'Competencias', href: '/contests' },
        { label: activeContest?.name || 'Contest', href: `/contests/${contestId}` },
        { label: `Problema ${letter?.toUpperCase() || ''}` },
      ]
    : [
        { label: 'Problemas', href: '/problems' },
        { label: problem.title },
      ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* === Left Column: Content === */}
        <div className="space-y-6 min-w-0">
          {/* Tags above title */}
          {!isContestContext && problem.tags.length > 0 && (
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

          {/* Statement */}
          <Card>
            <CardHeader>
              <CardTitle>Enunciado</CardTitle>
            </CardHeader>
            <CardContent>
              {problem.statement ? (
                <MarkdownRenderer content={problem.statement} />
              ) : (
                <p className="text-neutral-text-muted italic">Sin enunciado aún</p>
              )}
            </CardContent>
          </Card>

          {/* Input / Output as separate cards */}
          {(problem.inputFormat || problem.outputFormat) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {problem.inputFormat && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wider">Entrada</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer content={problem.inputFormat} />
                  </CardContent>
                </Card>
              )}
              {problem.outputFormat && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wider">Salida</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MarkdownRenderer content={problem.outputFormat} />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Examples */}
          {problem.examples && problem.examples.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ejemplos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {problem.examples.map((ex, idx) => (
                  <ExampleBlock key={idx} index={idx + 1} input={ex.input} output={ex.output} explanation={ex.explanation} />
                ))}
              </CardContent>
            </Card>
          )}

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
          {canEdit && problem.files && (
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
          {canEdit && problem.modifiers && problem.modifiers.length > 0 && (
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
                    if (isContestContext && contestId && letter) {
                      navigate(`/contests/${contestId}/submit?problem=${letter.toUpperCase()}`)
                    } else {
                      navigate(`/submit?problem=${problem.slug}`)
                    }
                  }}
                >
                  <Send className="h-4 w-4" />
                  Enviar solución
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
              <MetadataRow icon={Calendar} label="Creado" value={new Date(problem.createdAt).toLocaleDateString('es')} />
            </CardContent>
          </Card>

          {/* Statistics summary */}
          {stats && stats.totalSubmissions > 0 && stats.uniqueUsers && (
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
                  <Button variant="primary" className="w-full gap-2" onClick={handlePublish} isLoading={publishMutation.isPending}>
                    <ArrowUpCircle className="h-4 w-4" />
                    Publicar
                  </Button>
                )}
                {problem.status === 'PUBLISHED' && (
                  <Button variant="outline" className="w-full gap-2" onClick={handleUnpublish} isLoading={unpublishMutation.isPending}>
                    <ArrowDownCircle className="h-4 w-4" />
                    Despublicar
                  </Button>
                )}
                <Button variant="outline" className="w-full gap-2" onClick={() => navigate(`/problems/${problem.slug}/edit`)}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                {canDelete && (
                  <Button variant="danger" className="w-full gap-2" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </aside>
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

interface FileIndicatorProps { label: string; available: boolean; detail?: string }

function FileIndicator({ label, available, detail }: FileIndicatorProps) {
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

interface ExampleBlockProps { index: number; input: string; output: string; explanation?: string }

function ExampleBlock({ index, input, output, explanation }: ExampleBlockProps) {
  return (
    <div className="border border-neutral-border rounded-lg overflow-hidden">
      <div className="bg-neutral-background px-4 py-2 border-b border-neutral-border flex items-center justify-between">
        <span className="text-xs font-bold text-neutral-text-muted uppercase tracking-wider">Ejemplo {index}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Entrada</span>
            <CopyButton text={input} />
          </div>
          <pre className="font-mono text-sm text-neutral-text-primary whitespace-pre bg-neutral-background rounded-md p-3">{input}</pre>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Salida</span>
            <CopyButton text={output} />
          </div>
          <pre className="font-mono text-sm text-neutral-text-primary whitespace-pre bg-neutral-background rounded-md p-3">{output}</pre>
        </div>
      </div>
      {explanation && (
        <div className="px-4 py-3 border-t border-neutral-border bg-brand-primary-muted/30">
          <MarkdownRenderer content={`**Nota:** ${explanation}`} className="text-sm" />
        </div>
      )}
    </div>
  )
}

interface CopyButtonProps { text: string }

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-neutral-border/50 transition-colors text-neutral-text-muted hover:text-neutral-text-primary"
      title="Copiar"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-status-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}
