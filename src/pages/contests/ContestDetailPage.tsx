import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Clock, Users, Trophy, Lock } from 'lucide-react'
import { EntityDetailPage } from '@/components/patterns'
import { Button } from '@/components/ui'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui'
import { ContestCountdown } from '@/components/features/ContestCountdown'
import { useContestDetail, useRegisterToContest, useUnregisterFromContest, useDeleteContest } from '@/hooks/api/useContests'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`
  if (hours > 0) return `${hours}h`
  return `${minutes}min`
}

function ProblemsTable({ problems }: { problems: Array<{ position: number; slug: string; title: string; timeLimit: number; memoryLimit: number }> }) {
  if (problems.length === 0) {
    return <p className="text-neutral-text-muted text-sm py-4">Los problemas se mostrarán cuando el contest inicie.</p>
  }
  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead>
          <TableHead>Problema</TableHead>
          <TableHead className="w-32">Tiempo</TableHead>
          <TableHead className="w-32">Memoria</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {problems.map((p) => (
          <TableRow key={p.slug}>
            <TableCell className="font-mono font-bold">{labels[p.position - 1] || p.position}</TableCell>
            <TableCell>{p.title}</TableCell>
            <TableCell>{p.timeLimit}ms</TableCell>
            <TableCell>{p.memoryLimit} MiB</TableCell>
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

  const badges = contest
    ? [
        { label: contest.status === 'SCHEDULED' ? 'Programado' : contest.status === 'ACTIVE' ? 'En curso' : 'Finalizado', variant: contest.status === 'ACTIVE' ? 'success' as const : 'default' as const },
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
              {contest.status === 'ACTIVE' && (
                <ContestCountdown targetTime={contest.endTime} label="Termina en" />
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
        {
          id: 'standings',
          label: 'Standings',
          content: (
            <div className="text-center py-8">
              <Button variant="primary" onClick={() => navigate(`/contests/${contest.id}/standings`)}>
                Ver standings completos
              </Button>
            </div>
          ),
        },
        {
          id: 'submissions',
          label: 'Submissions',
          content: (
            <div className="text-center py-8">
              <Button variant="outline" onClick={() => navigate(`/contests/${contest.id}/submissions`)}>
                Ver submissions del contest
              </Button>
            </div>
          ),
        },
      ]
    : []

  return (
    <EntityDetailPage
      title={contest?.name || 'Cargando...'}
      isLoading={isLoading}
      breadcrumbs={[
        { label: 'Competencias', href: '/contests' },
        { label: contest?.name || '...' },
      ]}
      badges={badges}
      metadata={metadata}
      tabs={tabs}
      onEdit={isLead && contest && !contest.locked ? () => navigate(`/groups/${contest.group.id}/contests/${contest.id}/edit`) : undefined}
      onDelete={isLead && contest && !contest.locked ? handleDelete : undefined}
    />
  )
}
