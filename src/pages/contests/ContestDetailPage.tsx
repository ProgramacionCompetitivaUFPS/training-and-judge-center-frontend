import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Clock, Users, Trophy, Lock, BarChart3, FileText, Send, Globe, Swords } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { EntityDetailPage } from '@/components/patterns'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui'
import { ContestCountdown } from '@/components/features/ContestCountdown'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { SubmitSolutionDialog } from '@/components/features/SubmitSolutionDialog'
import { TeamContestRegistration } from '@/components/features/TeamContestRegistration'
import { useContestDetail, useRegisterToContest, useUnregisterFromContest, useDeleteContest } from '@/hooks/api/useContests'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { formatDateTz } from '@/lib/utils'

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`
  if (hours > 0) return `${hours}h`
  return `${minutes}min`
}

function participationModeLabel(mode: string): string {
  switch (mode) {
    case 'INDIVIDUAL': return 'Individual'
    case 'TEAM': return 'Por equipos'
    case 'MIXED': return 'Mixto'
    default: return mode
  }
}

function StatCell({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-neutral-text-muted shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-neutral-text-muted leading-none mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-neutral-text leading-tight">{value}</p>
      </div>
    </div>
  )
}

function ProblemsTable({ problems, contestId, showSubmit, onSubmit }: {
  problems: Array<{ position: number; slug: string; title: string; timeLimit: number; memoryLimit: number }>
  contestId?: string
  showSubmit?: boolean
  onSubmit?: (slug: string, title: string) => void
}) {
  if (problems.length === 0) {
    return <p className="text-neutral-text-muted text-sm py-4">Los problemas se mostrarán cuando el contest inicie.</p>
  }
  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Problema</TableHead>
          <TableHead className="w-24">Tiempo</TableHead>
          <TableHead className="w-24">Memoria</TableHead>
          {showSubmit && <TableHead className="w-24" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {problems.map((p) => (
          <TableRow key={p.slug}>
            <TableCell className="font-mono font-bold">{labels[p.position - 1] || p.position}</TableCell>
            <TableCell>
              <Link to={`/problems/${p.slug}${contestId ? `?contest=${contestId}` : ''}`} className="text-brand-primary hover:underline">
                {p.title}
              </Link>
            </TableCell>
            <TableCell>{p.timeLimit}ms</TableCell>
            <TableCell>{p.memoryLimit} MiB</TableCell>
            {showSubmit && (
              <TableCell>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => onSubmit?.(p.slug, p.title)}>
                  <Send className="h-3.5 w-3.5" />
                  Enviar
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function ContestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const { data: contest, isLoading } = useContestDetail(id || '')
  const registerMutation = useRegisterToContest()
  const unregisterMutation = useUnregisterFromContest()
  const deleteMutation = useDeleteContest()

  if (!id) return null

  const isLead = user?.role === 'ADMIN' || user?.role === 'COACH'
  const canRegister = user?.role === 'CONTESTANT' && contest?.status === 'SCHEDULED' && !contest?.isRegistered
  const canUnregister = contest?.status === 'SCHEDULED' && contest?.isRegistered

  // Submit dialog state
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitProblem, setSubmitProblem] = useState<{ slug: string; title: string } | null>(null)

  const openSubmitDialog = (slug: string, title: string) => {
    setSubmitProblem({ slug, title })
    setSubmitOpen(true)
  }

  const handleRegister = () => {
    if (!contest) return
    registerMutation.mutate(
      { groupId: contest.group.id, contestId: contest.id },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Registrado', description: 'Te has registrado al contest' }),
        onError: () => toast({ variant: 'error', title: 'Error', description: 'No se pudo registrar' }),
      },
    )
  }

  const handleUnregister = () => {
    if (!contest) return
    unregisterMutation.mutate(
      { groupId: contest.group.id, contestId: contest.id },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Desregistrado', description: 'Has cancelado tu registro' }),
        onError: () => toast({ variant: 'error', title: 'Error', description: 'No se pudo cancelar el registro' }),
      },
    )
  }

  const handleDelete = () => {
    if (!contest) return
    deleteMutation.mutate(
      { groupId: contest.group.id, contestId: contest.id },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Eliminado', description: 'Contest eliminado' })
          navigate('/contests')
        },
        onError: () => toast({ variant: 'error', title: 'Error', description: 'No se pudo eliminar' }),
      },
    )
  }

  // === ACTIVE CONTEST: Competition mode layout ===
  if (contest?.status === 'ACTIVE') {
    return (
      <AppLayout
        breadcrumbs={[
          { label: 'Competencias', href: '/contests' },
          { label: contest.name },
        ]}
      >
        <div className="space-y-6">
          {/* Header row */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-extrabold text-neutral-text-primary">{contest.name}</h1>
                <ContestStatusBadge status={contest.status} />
                {contest.isRegistered && <Badge variant="primary">Registrado</Badge>}
              </div>
              <p className="text-sm text-neutral-text-muted">
                {contest.group.name} · @{contest.owner.nickname}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" className="gap-2" onClick={() => navigate(`/contests/${contest.id}/standings`)}>
                <BarChart3 className="h-4 w-4" />
                Standings
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => navigate(`/contests/${contest.id}/submissions`)}>
                <FileText className="h-4 w-4" />
                Submissions
              </Button>
            </div>
          </div>

          {/* Two-column: info | problems */}
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            {/* Left column */}
            <div className="space-y-4">
              {/* Countdown card with accent border */}
              <Card className="border-brand-primary/30 bg-brand-primary/5">
                <CardContent className="pt-6">
                  <ContestCountdown targetTime={contest.endTime} label="Tiempo restante" />
                </CardContent>
              </Card>

              {/* Schedule card: start/end side by side */}
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="grid grid-cols-2 divide-x divide-neutral-border">
                    <div className="pr-3 text-center">
                      <p className="text-xs text-neutral-text-muted mb-1">Inicio</p>
                      <p className="text-sm font-semibold text-neutral-text">{formatDateTz(contest.startTime, { short: true })}</p>
                    </div>
                    <div className="pl-3 text-center">
                      <p className="text-xs text-neutral-text-muted mb-1">Fin</p>
                      <p className="text-sm font-semibold text-neutral-text">{formatDateTz(contest.endTime, { short: true })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats grid */}
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <StatCell icon={Clock} label="Duración" value={formatDuration(contest.duration)} />
                    <StatCell icon={Users} label="Participantes" value={String(contest.participantCount)} />
                    <StatCell icon={Trophy} label="Penalización" value={`${contest.penalty} min`} />
                    <StatCell icon={Swords} label="Modalidad" value={participationModeLabel(contest.participationMode)} />
                    {contest.freezeMinutes != null && (
                      <StatCell icon={Lock} label="Freeze" value={`${contest.freezeMinutes} min`} />
                    )}
                  </div>
                </CardContent>
              </Card>

              {contest.description && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-neutral-text whitespace-pre-wrap">{contest.description}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: problems table */}
            <Card>
              <CardHeader>
                <CardTitle>Problemas ({contest.problems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ProblemsTable
                  problems={contest.problems}
                  contestId={contest.id}
                  showSubmit={contest.isRegistered}
                  onSubmit={openSubmitDialog}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {submitProblem && (
          <SubmitSolutionDialog
            open={submitOpen}
            onOpenChange={setSubmitOpen}
            problemSlug={submitProblem.slug}
            problemTitle={submitProblem.title}
            contestId={contest.id}
            groupId={contest.group.id}
          />
        )}
      </AppLayout>
    )
  }

  // === SCHEDULED / FINISHED: Standard detail layout ===
  const badges = contest
    ? [
        { label: contest.status === 'SCHEDULED' ? 'Programado' : 'Finalizado', variant: 'default' as const },
        ...(contest.isRegistered ? [{ label: 'Registrado', variant: 'primary' as const }] : []),
        ...(contest.locked ? [{ label: 'Bloqueado', variant: 'warning' as const }] : []),
      ]
    : []

  const tabs = contest
    ? [
        {
          id: 'info',
          label: 'Información',
          content: (
            <div className="space-y-4">
              {contest.status === 'SCHEDULED' && (
                <Card className="border-brand-primary/30 bg-brand-primary/5">
                  <CardContent className="pt-6">
                    <ContestCountdown targetTime={contest.startTime} label="Comienza en" />
                  </CardContent>
                </Card>
              )}
              {/* Schedule + stats compact */}
              <Card>
                <CardContent className="pt-5 pb-4 space-y-4">
                  {/* Dates row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-neutral-text-muted mb-0.5">Inicio</p>
                      <p className="text-sm font-semibold text-neutral-text">{formatDateTz(contest.startTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-text-muted mb-0.5">Fin</p>
                      <p className="text-sm font-semibold text-neutral-text">{formatDateTz(contest.endTime)}</p>
                    </div>
                  </div>
                  <div className="border-t border-neutral-border" />
                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <StatCell icon={Clock} label="Duración" value={formatDuration(contest.duration)} />
                    <StatCell icon={Users} label="Participantes" value={String(contest.participantCount)} />
                    <StatCell icon={Trophy} label="Penalización" value={`${contest.penalty} min`} />
                    <StatCell icon={Swords} label="Modalidad" value={participationModeLabel(contest.participationMode)} />
                    {contest.freezeMinutes != null && (
                      <StatCell icon={Lock} label="Freeze" value={`${contest.freezeMinutes} min`} />
                    )}
                    {contest.enablePostContest && (
                      <StatCell icon={Globe} label="Post-contest" value="Habilitada" />
                    )}
                  </div>
                </CardContent>
              </Card>
              {contest.description && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-text-muted mb-2">Descripción</h3>
                  <p className="text-neutral-text whitespace-pre-wrap">{contest.description}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-sm text-neutral-text-muted">
                  Grupo: <span className="text-neutral-text font-medium">{contest.group.name}</span>
                </p>
                <p className="text-sm text-neutral-text-muted">
                  Organizador: <span className="text-neutral-text font-medium">@{contest.owner.nickname}</span>
                </p>
                {contest.participationMode !== 'INDIVIDUAL' && contest.teamSizeMin && contest.teamSizeMax && (
                  <p className="text-sm text-neutral-text-muted">
                    Tamaño de equipo: <span className="text-neutral-text font-medium">{contest.teamSizeMin}–{contest.teamSizeMax} miembros</span>
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                {canRegister && (
                  <Button variant="primary" onClick={handleRegister} isLoading={registerMutation.isPending}>
                    Registrarse
                  </Button>
                )}
                {canUnregister && (
                  <Button variant="outline" onClick={handleUnregister} isLoading={unregisterMutation.isPending}>
                    Cancelar registro
                  </Button>
                )}
              </div>
              {contest.status === 'SCHEDULED' && contest.participationMode !== 'INDIVIDUAL' && (
                <TeamContestRegistration
                  contestId={contest.id}
                  contestStatus={contest.status}
                  participationMode={contest.participationMode}
                  teamSizeMin={contest.teamSizeMin}
                  teamSizeMax={contest.teamSizeMax}
                  isRegistered={contest.isRegistered}
                />
              )}
            </div>
          ),
        },
        {
          id: 'problems',
          label: `Problemas (${contest.problems.length})`,
          content: <ProblemsTable problems={contest.problems} contestId={contest.id} />,
        },
      ]
    : []

  const primaryAction = contest?.status === 'FINISHED'
    ? { label: 'Standings', onClick: () => navigate(`/contests/${contest.id}/standings`), icon: BarChart3, variant: 'primary' as const }
    : undefined

  const additionalActions = contest?.status === 'FINISHED'
    ? [{ label: 'Submissions', onClick: () => navigate(`/contests/${contest.id}/submissions`), icon: FileText }]
    : undefined

  return (
    <EntityDetailPage
      title={contest?.name || 'Cargando...'}
      subtitle={contest ? `${contest.group.name} · Organizador: @${contest.owner.nickname}` : undefined}
      isLoading={isLoading}
      breadcrumbs={[
        { label: 'Competencias', href: '/contests' },
        { label: contest?.name || '...' },
      ]}
      badges={badges}
      tabs={tabs}
      primaryAction={primaryAction}
      additionalActions={additionalActions}
      onEdit={isLead && contest && !contest.locked ? () => navigate(`/groups/${contest.group.id}/contests/${contest.id}/edit`) : undefined}
      onDelete={isLead && contest && !contest.locked ? handleDelete : undefined}
    />
  )
}
