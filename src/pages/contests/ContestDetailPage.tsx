import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Clock, Users, Trophy, Lock, BarChart3, FileText, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import { EntityDetailPage } from '@/components/patterns'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui'
import { ContestCountdown } from '@/components/features/ContestCountdown'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { SubmitSolutionDialog } from '@/components/features/SubmitSolutionDialog'
import { useContestDetail, useRegisterToContest, useUnregisterFromContest, useDeleteContest } from '@/hooks/api/useContests'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`
  if (hours > 0) return `${hours}h`
  return `${minutes}min`
}

function ProblemsTable({ problems, showSubmit, onSubmit }: {
  problems: Array<{ position: number; slug: string; title: string; timeLimit: number; memoryLimit: number }>
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
              <Link to={`/problems/${p.slug}`} className="text-brand-primary hover:underline">
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
          {/* Header row: title + status + actions */}
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

          {/* Two-column: countdown+info | problems */}
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            {/* Left: countdown + compact info */}
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <ContestCountdown targetTime={contest.endTime} label="Tiempo restante" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-neutral-text-muted" />
                    <span className="text-neutral-text-muted">Duración:</span>
                    <span className="font-medium">{formatDuration(contest.duration)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-neutral-text-muted" />
                    <span className="text-neutral-text-muted">Participantes:</span>
                    <span className="font-medium">{contest.participantCount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-neutral-text-muted" />
                    <span className="text-neutral-text-muted">Penalización:</span>
                    <span className="font-medium">{contest.penalty} min</span>
                  </div>
                  {contest.freezeMinutes != null && (
                    <div className="flex items-center gap-2 text-sm">
                      <Lock className="h-4 w-4 text-neutral-text-muted" />
                      <span className="text-neutral-text-muted">Freeze:</span>
                      <span className="font-medium">{contest.freezeMinutes} min antes</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-neutral-text-muted" />
                    <span className="text-neutral-text-muted">Fin:</span>
                    <span className="font-medium">{formatDateShort(contest.endTime)}</span>
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
                  showSubmit={contest.isRegistered}
                  onSubmit={openSubmitDialog}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit dialog */}
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

  const metadata = contest
    ? [
        { label: 'Inicio', value: formatDate(contest.startTime), icon: Calendar },
        { label: 'Fin', value: formatDate(contest.endTime), icon: Calendar },
        { label: 'Duración', value: formatDuration(contest.duration), icon: Clock },
        { label: 'Participantes', value: String(contest.participantCount), icon: Users },
        { label: 'Penalización', value: `${contest.penalty} min`, icon: Trophy },
        ...(contest.freezeMinutes != null ? [{ label: 'Freeze', value: `${contest.freezeMinutes} min antes del fin`, icon: Lock }] : []),
      ]
    : []

  const tabs = contest
    ? [
        {
          id: 'info',
          label: 'Información',
          content: (
            <div className="space-y-6">
              {contest.status === 'SCHEDULED' && (
                <ContestCountdown targetTime={contest.startTime} label="Comienza en" />
              )}
              {contest.description && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-text-muted mb-2">Descripción</h3>
                  <p className="text-neutral-text whitespace-pre-wrap">{contest.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-neutral-text-muted">
                  Grupo: <span className="text-neutral-text font-medium">{contest.group.name}</span>
                </p>
                <p className="text-sm text-neutral-text-muted">
                  Organizador: <span className="text-neutral-text font-medium">@{contest.owner.nickname}</span>
                </p>
                {contest.enablePostContest && (
                  <p className="text-sm text-status-success mt-1">Post-competencia habilitada</p>
                )}
              </div>
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
          ),
        },
        {
          id: 'problems',
          label: `Problemas (${contest.problems.length})`,
          content: <ProblemsTable problems={contest.problems} />,
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
      metadata={metadata}
      tabs={tabs}
      primaryAction={primaryAction}
      additionalActions={additionalActions}
      onEdit={isLead && contest && !contest.locked ? () => navigate(`/groups/${contest.group.id}/contests/${contest.id}/edit`) : undefined}
      onDelete={isLead && contest && !contest.locked ? handleDelete : undefined}
    />
  )
}
