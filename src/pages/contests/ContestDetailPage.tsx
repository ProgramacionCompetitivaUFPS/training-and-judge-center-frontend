import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, Users, Trophy, Lock, Unlock, Globe, Swords, Calendar, User, EyeOff, UsersRound, Flag, Loader2, Plus, X } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from '@/components/ui'
import { ContestCountdown } from '@/components/features/ContestCountdown'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { ContestProblemsTable } from '@/components/features/ContestProblemsTable'
import { ContestInfoSidebar, ContestQuickLinks, ContestOrganizerCard, ContestAdminActions } from '@/components/features/ContestInfoSidebar'
import { TeamContestRegistration } from '@/components/features/TeamContestRegistration'
import { useContestDetail, useRegisterToContest, useUnregisterFromContest, useDeleteContest, useUpdateContest } from '@/hooks/api/useContests'
import { useMyTeams, useTeamDetail, useRegisterTeamToContest, useUnregisterTeamFromContest } from '@/hooks/api/useTeams'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { ApiClientError } from '@/lib/errors'
import { formatDateTz, formatDuration, participationModeLabel } from '@/lib/utils'

function LockedProblemsPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-16 h-16 bg-neutral-background rounded-full flex items-center justify-center mb-4">
        <EyeOff className="h-7 w-7 text-neutral-text-muted" />
      </div>
      <h4 className="text-base font-bold text-neutral-text-primary mb-1">
        Los problemas se revelarán al iniciar el contest
      </h4>
      <p className="text-sm text-neutral-text-muted max-w-sm">
        Solo los participantes registrados podrán ver los enunciados una vez comience la competencia.
      </p>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-neutral-background rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export function ContestDetailPage() {
  const { groupId, id } = useParams<{ groupId: string; id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const { data: contest, isLoading } = useContestDetail(groupId || '', id || '')
  const registerMutation = useRegisterToContest()
  const unregisterMutation = useUnregisterFromContest()
  const deleteMutation = useDeleteContest()
  const updateMutation = useUpdateContest()

  const [problemSlug, setProblemSlug] = useState('')

  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const { data: teamsData, isLoading: isLoadingTeams } = useMyTeams()
  const { data: teamDetail, isLoading: isLoadingTeamDetail } = useTeamDetail(selectedTeamId)
  const registerTeamMutation = useRegisterTeamToContest()
  const unregisterTeamMutation = useUnregisterTeamFromContest()

  if (!id || !groupId) return null

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Competencias', href: '/contests' }, { label: '...' }]}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        </div>
      </AppLayout>
    )
  }

  if (!contest) return null

  const isLead = user?.role === 'ADMIN' || user?.role === 'COACH'
  const canRegisterIndividual = contest.status === 'SCHEDULED' && !contest.isRegistered &&
    (contest.participationMode === 'INDIVIDUAL' || contest.participationMode === 'MIXED')
  const canUnregister = contest.status === 'SCHEDULED' && contest.isRegistered

  const handleRegister = () => {
    registerMutation.mutate(
      { groupId, contestId: contest.id },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Registrado', description: 'Te has registrado al contest' }),
        onError: () => toast({ variant: 'error', title: 'Error', description: 'No se pudo registrar' }),
      },
    )
  }

  const handleUnregister = () => {
    unregisterMutation.mutate(
      { groupId, contestId: contest.id },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Desregistrado', description: 'Has cancelado tu registro' }),
        onError: () => toast({ variant: 'error', title: 'Error', description: 'No se pudo cancelar el registro' }),
      },
    )
  }

  const handleDelete = () => {
    deleteMutation.mutate(
      { groupId, contestId: contest.id },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Eliminado', description: 'Contest eliminado' })
          navigate('/contests')
        },
        onError: () => toast({ variant: 'error', title: 'Error', description: 'No se pudo eliminar' }),
      },
    )
  }

  const handleLockToggle = () => {
    const newLocked = !contest.locked
    updateMutation.mutate(
      { groupId, contestId: contest.id, data: { locked: newLocked } },
      {
        onSuccess: () => toast({
          variant: 'success',
          title: newLocked ? 'Bloqueado' : 'Desbloqueado',
          description: newLocked ? 'El contest fue bloqueado' : 'El contest fue desbloqueado',
        }),
        onError: () => toast({
          variant: 'error',
          title: 'Error',
          description: newLocked ? 'No se pudo bloquear' : 'No se pudo desbloquear',
        }),
      },
    )
  }

  const handleRegisterTeam = (teamId: string, selectedMembers: string[]) => {
    registerTeamMutation.mutate(
      { groupId, contestId: contest.id, teamId, selectedMembers },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Equipo registrado', description: 'Tu equipo fue registrado al contest' }),
        onError: (err) => toast({ variant: 'error', title: 'Error', description: err instanceof ApiClientError ? err.message : 'No se pudo registrar el equipo' }),
      },
    )
  }

  const handleUnregisterTeam = (teamId: string) => {
    unregisterTeamMutation.mutate(
      { groupId, contestId: contest.id, teamId },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Equipo desregistrado', description: 'Tu equipo fue removido del contest' }),
        onError: () => toast({ variant: 'error', title: 'Error', description: 'No se pudo desregistrar el equipo' }),
      },
    )
  }

  const handleAddProblem = () => {
    const slug = problemSlug.trim()
    if (!slug) return
    const newProblems = [
      ...contest.problems.map((p) => ({ slug: p.slug, order: p.position })),
      { slug, order: contest.problems.length + 1 },
    ]
    updateMutation.mutate(
      { groupId, contestId: contest.id, data: { problems: newProblems } },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Problema agregado', description: `Se agregó "${slug}" al contest` })
          setProblemSlug('')
        },
        onError: () => toast({ variant: 'error', title: 'Error', description: 'No se pudo agregar el problema' }),
      },
    )
  }

  const handleRemoveProblem = (slug: string) => {
    const remaining = contest.problems
      .filter((p) => p.slug !== slug)
      .map((p, i) => ({ slug: p.slug, order: i + 1 }))
    updateMutation.mutate(
      { groupId, contestId: contest.id, data: { problems: remaining } },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Problema removido', description: `Se removió "${slug}" del contest` }),
        onError: () => toast({ variant: 'error', title: 'Error', description: 'No se pudo remover el problema' }),
      },
    )
  }

  const breadcrumbs = [
    { label: 'Competencias', href: '/contests' },
    { label: contest.name },
  ]

  // ═══════════════════════════════════════════════
  // ACTIVE: Competition mode layout
  // ═══════════════════════════════════════════════
  if (contest.status === 'ACTIVE') {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Header with compact timer */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ContestStatusBadge status={contest.status} />
                <span className="text-sm font-medium text-neutral-text-muted">{contest.group.name}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-text-primary tracking-tight">
                {contest.name}
              </h1>
            </div>
            <div className="flex items-center gap-4 bg-neutral-surface border border-neutral-border rounded-xl px-5 py-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-brand-primary flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-text-muted leading-none mb-1">Tiempo restante</p>
                  <ContestCountdown targetTime={contest.endTime} />
                </div>
              </div>
              <div className="h-8 w-px bg-neutral-border" />
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-text-muted leading-none mb-1">Participantes</p>
                <p className="text-lg font-extrabold text-neutral-text-primary">{contest.participantCount}</p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-8">
              <Card>
                <CardHeader>
                  <CardTitle>Problemas del concurso</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ContestProblemsTable
                    problems={contest.problems}
                    groupId={groupId}
                    contestId={contest.id}
                    showSubmit={contest.isRegistered}
                  />
                </CardContent>
              </Card>
            </section>

            <aside className="lg:col-span-4 space-y-4">
              {/* User position — first in sidebar for visibility */}
              {contest.isRegistered && (
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-[10px] font-semibold text-neutral-text-muted uppercase tracking-widest mb-3">Tu posición actual</p>
                    <div className="flex items-baseline gap-1.5 mb-3">
                      <span className="text-3xl font-extrabold text-brand-primary tracking-tight">#3</span>
                      <span className="text-sm text-neutral-text-muted font-medium">/ {contest.participantCount}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2.5 py-1 bg-status-success/10 text-status-success text-xs font-bold rounded-md">
                        2 Resueltos
                      </span>
                      <span className="px-2.5 py-1 bg-neutral-background text-neutral-text-muted text-xs font-bold rounded-md">
                        85 min
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <ContestInfoSidebar contest={contest} />
              <ContestQuickLinks groupId={groupId} contestId={contest.id} />

              {contest.description && (
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-sm text-neutral-text whitespace-pre-wrap">{contest.description}</p>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ═══════════════════════════════════════════════
  // SCHEDULED: Hero countdown layout
  // ═══════════════════════════════════════════════
  if (contest.status === 'SCHEDULED') {
    const showTeamRegistration = contest.participationMode !== 'INDIVIDUAL'

    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-8">
          {/* Hero Countdown */}
          <section className="relative overflow-hidden rounded-lg bg-neutral-surface border border-neutral-border p-8 md:p-12 text-center">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-primary/5 to-transparent pointer-events-none" />
            <div className="relative">
              <ContestStatusBadge status={contest.status} />
              <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-text-primary mt-4 mb-6 tracking-tight">
                {contest.name}
              </h1>
              <ContestCountdown
                targetTime={contest.startTime}
                label="Comienza en"
                variant="hero"
              />
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {canRegisterIndividual && (
                  <Button variant="primary" size="lg" onClick={handleRegister} isLoading={registerMutation.isPending}>
                    <User className="h-4 w-4 mr-2" />
                    Registrarse
                  </Button>
                )}
                {showTeamRegistration && !contest.isRegistered && (
                  <TeamContestRegistration
                    contestId={contest.id}
                    contestStatus={contest.status}
                    participationMode={contest.participationMode}
                    teamSizeMin={contest.teamSizeMin}
                    teamSizeMax={contest.teamSizeMax}
                    isRegistered={contest.isRegistered}
                    variant="inline"
                    teams={teamsData?.teams ?? []}
                    isLoadingTeams={isLoadingTeams}
                    selectedTeamDetail={teamDetail}
                    isLoadingTeamDetail={isLoadingTeamDetail}
                    registeredTeamId={undefined}
                    onRegisterTeam={handleRegisterTeam}
                    onUnregisterTeam={handleUnregisterTeam}
                    isRegistering={registerTeamMutation.isPending}
                    isUnregistering={unregisterTeamMutation.isPending}
                    registrationError={registerTeamMutation.error?.message}
                    onTeamSelect={setSelectedTeamId}
                  />
                )}
                {canUnregister && (
                  <Button variant="outline" size="lg" onClick={handleUnregister} isLoading={unregisterMutation.isPending}>
                    Cancelar registro
                  </Button>
                )}
                {contest.isRegistered && (
                  <Badge variant="success" className="self-center text-sm px-4 py-2">Registrado</Badge>
                )}
              </div>
            </div>
          </section>

          {/* Bento grid: info + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            <div className="space-y-6">
              {/* Info card */}
              <Card>
                <CardHeader>
                  <CardTitle>Información del concurso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-neutral-background rounded-lg">
                        <Calendar className="h-5 w-5 text-neutral-text-muted" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Fecha y hora</p>
                        <p className="text-sm font-semibold text-neutral-text-primary">{formatDateTz(contest.startTime)}</p>
                        <p className="text-xs text-neutral-text-muted">hasta {formatDateTz(contest.endTime, { short: true })}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-neutral-background rounded-lg">
                        <Clock className="h-5 w-5 text-neutral-text-muted" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Duración</p>
                        <p className="text-sm font-semibold text-neutral-text-primary">{formatDuration(contest.duration)}</p>
                        <p className="text-xs text-neutral-text-muted">Tiempo continuo</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-neutral-background rounded-lg">
                        <Users className="h-5 w-5 text-neutral-text-muted" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Participantes</p>
                        <p className="text-sm font-semibold text-neutral-text-primary">{contest.participantCount} inscritos</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-neutral-background rounded-lg">
                        <Trophy className="h-5 w-5 text-neutral-text-muted" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">Penalización</p>
                        <p className="text-sm font-semibold text-neutral-text-primary">{contest.penalty} minutos</p>
                        <p className="text-xs text-neutral-text-muted">Por envío incorrecto</p>
                      </div>
                    </div>
                  </div>
                  {contest.description && (
                    <>
                      <div className="border-t border-neutral-border" />
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-text-primary mb-2">Descripción</h4>
                        <p className="text-sm text-neutral-text-muted whitespace-pre-wrap leading-relaxed">{contest.description}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Problems: locked or visible */}
              <Card className={contest.problems.length === 0 ? 'border-dashed border-neutral-border' : ''}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Problemas
                    {contest.problems.length === 0 && <Lock className="h-4 w-4 text-neutral-text-muted" />}
                  </CardTitle>
                  {contest.problems.length === 0 && (
                    <Badge variant="default">Acceso restringido</Badge>
                  )}
                </CardHeader>
                <CardContent className={contest.problems.length > 0 ? 'p-0' : ''}>
                  {contest.problems.length === 0 ? (
                    <LockedProblemsPlaceholder />
                  ) : (
                    <ContestProblemsTable problems={contest.problems} groupId={groupId} contestId={contest.id} />
                  )}
                </CardContent>
              </Card>

              {/* Problem management — Lead/Admin only, unlocked contest */}
              {isLead && !contest.locked && (
                <Card>
                  <CardHeader>
                    <CardTitle>Gestión de problemas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Slug del problema"
                        value={problemSlug}
                        onChange={(e) => setProblemSlug(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddProblem() }}
                        className="flex-1"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAddProblem}
                        isLoading={updateMutation.isPending}
                        disabled={!problemSlug.trim()}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                    {contest.problems.length > 0 && (
                      <ul className="divide-y divide-neutral-border">
                        {contest.problems.map((p) => (
                          <li key={p.slug} className="flex items-center justify-between py-2">
                            <span className="text-sm font-medium text-neutral-text-primary">
                              {p.position}. {p.title} <span className="text-neutral-text-muted">({p.slug})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveProblem(p.slug)}
                              disabled={updateMutation.isPending}
                              className="p-1 rounded hover:bg-status-error/10 text-neutral-text-muted hover:text-status-error transition-colors"
                              aria-label={`Remover ${p.title}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Modalidad</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="flex items-center gap-3 p-2.5 bg-neutral-background rounded-lg">
                    <Swords className="h-4 w-4 text-brand-primary" />
                    <span className="text-sm font-semibold">{participationModeLabel(contest.participationMode)}</span>
                  </div>
                  {contest.participationMode !== 'INDIVIDUAL' && contest.teamSizeMin && contest.teamSizeMax && (
                    <div className="flex items-center gap-3 p-2.5 bg-neutral-background rounded-lg">
                      <UsersRound className="h-4 w-4 text-brand-primary" />
                      <span className="text-sm font-semibold">{contest.teamSizeMin}–{contest.teamSizeMax} miembros por equipo</span>
                    </div>
                  )}
                  {contest.freezeMinutes != null && (
                    <div className="flex items-center gap-3 p-2.5 bg-neutral-background rounded-lg">
                      <Lock className="h-4 w-4 text-brand-primary" />
                      <span className="text-sm font-semibold">Freeze: {contest.freezeMinutes} min</span>
                    </div>
                  )}
                  {contest.enablePostContest && (
                    <div className="flex items-center gap-3 p-2.5 bg-neutral-background rounded-lg">
                      <Globe className="h-4 w-4 text-brand-primary" />
                      <span className="text-sm font-semibold">Post-contest habilitado</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <ContestOrganizerCard groupName={contest.group.name} ownerNickname={contest.owner.nickname} />

              {isLead && (
                <Card>
                  <CardContent className="pt-5 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleLockToggle}
                      isLoading={updateMutation.isPending}
                    >
                      {contest.locked ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                      {contest.locked ? 'Desbloquear contest' : 'Bloquear contest'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {isLead && !contest.locked && (
                <ContestAdminActions
                  contestId={contest.id}
                  groupId={groupId}
                  onDelete={handleDelete}
                  isDeleting={deleteMutation.isPending}
                />
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ═══════════════════════════════════════════════
  // FINISHED: Post-contest layout (same structure as ACTIVE)
  // ═══════════════════════════════════════════════
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header with finished indicator */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ContestStatusBadge status={contest.status} />
              <span className="text-sm font-medium text-neutral-text-muted">{contest.group.name}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-text-primary tracking-tight">
              {contest.name}
            </h1>
          </div>
          {/* Finished indicator — same container style as ACTIVE timer */}
          <div className="flex items-center gap-4 bg-neutral-surface border border-neutral-border rounded-xl px-5 py-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Flag className="h-4 w-4 text-neutral-text-muted flex-shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-text-muted leading-none mb-1">Finalizado</p>
                <p className="text-sm font-semibold text-neutral-text-primary">{formatDateTz(contest.endTime, { short: true })}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-neutral-border" />
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-text-muted leading-none mb-1">Participantes</p>
              <p className="text-lg font-extrabold text-neutral-text-primary">{contest.participantCount}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main content */}
          <section className="lg:col-span-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Problemas del concurso</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ContestProblemsTable problems={contest.problems} groupId={groupId} contestId={contest.id} />
              </CardContent>
            </Card>

            {contest.description && (
              <Card>
                <CardContent className="pt-5">
                  <h4 className="text-sm font-semibold text-neutral-text-primary mb-2">Descripción</h4>
                  <p className="text-sm text-neutral-text whitespace-pre-wrap leading-relaxed">{contest.description}</p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-4">
            <ContestInfoSidebar contest={contest} />
            <ContestQuickLinks groupId={groupId} contestId={contest.id} />
            <ContestOrganizerCard groupName={contest.group.name} ownerNickname={contest.owner.nickname} />

            {isLead && (
              <Card>
                <CardContent className="pt-5 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleLockToggle}
                    isLoading={updateMutation.isPending}
                  >
                    {contest.locked ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                    {contest.locked ? 'Desbloquear contest' : 'Bloquear contest'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {isLead && !contest.locked && (
              <ContestAdminActions
                contestId={contest.id}
                groupId={groupId}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
              />
            )}
          </aside>
        </div>
      </div>
    </AppLayout>
  )
}
