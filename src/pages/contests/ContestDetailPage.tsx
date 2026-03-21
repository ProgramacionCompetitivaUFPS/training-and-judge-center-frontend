import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Clock, Users, Trophy, Lock, BarChart3, FileText } from 'lucide-react'
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

  // Countdown goes in subtitle area (visible at the top, next to contest info)
  const subtitle = contest
    ? `${contest.group.name} · Organizador: @${contest.owner.nickname}`
    : undefined

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
              {contest.description && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-text-muted mb-2">Descripción</h3>
                  <p className="text-neutral-text whitespace-pre-wrap">{contest.description}</p>
                </div>
              )}
              {contest.enablePostContest && (
                <p className="text-sm text-status-success">Post-competencia habilitada</p>
              )}
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

  // Primary action: standings (most common action during/after contest)
  const primaryAction = contest?.status !== 'SCHEDULED'
    ? {
        label: 'Standings',
        onClick: () => navigate(`/contests/${contest!.id}/standings`),
        icon: BarChart3,
        variant: 'primary' as const,
      }
    : undefined

  const additionalActions = contest
    ? [
        ...(contest.status !== 'SCHEDULED'
          ? [{
              label: 'Submissions',
              onClick: () => navigate(`/contests/${contest.id}/submissions`),
              icon: FileText,
            }]
          : []),
      ]
    : undefined

  return (
    <>
      {/* Countdown banner at the very top */}
      {contest?.status === 'SCHEDULED' && (
        <div className="bg-brand-primary/5 border-b border-brand-primary/20">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <ContestCountdown targetTime={contest.startTime} label="Comienza en" className="!text-left flex items-center gap-3 [&>p:first-child]:mb-0 [&>p:last-child]:text-lg" />
          </div>
        </div>
      )}
      {contest?.status === 'ACTIVE' && (
        <div className="bg-status-success/5 border-b border-status-success/20">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <ContestCountdown targetTime={contest.endTime} label="Termina en" className="!text-left flex items-center gap-3 [&>p:first-child]:mb-0 [&>p:last-child]:text-lg" />
          </div>
        </div>
      )}
      <EntityDetailPage
        title={contest?.name || 'Cargando...'}
        subtitle={subtitle}
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
    </>
  )
}
