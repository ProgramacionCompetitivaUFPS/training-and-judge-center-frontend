import { useCallback, useState, type ReactNode } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Clock, Users, Trophy, Lock, Unlock, Globe, Swords, Calendar, User, UserPlus, EyeOff, UsersRound, Flag, Loader2, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import {
  Button, Card, CardContent, CardHeader, CardTitle, Badge, SearchSelect, Input,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui'
import { ContestCountdown } from '@/components/features/ContestCountdown'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { ContestProblemsTable } from '@/components/features/ContestProblemsTable'
import { ContestInfoSidebar, ContestQuickLinks, ContestOrganizerCard, ContestAdminActions } from '@/components/features/ContestInfoSidebar'
import { TeamContestRegistration } from '@/components/features/TeamContestRegistration'
import { LateRegistrationConfirmDialog } from '@/components/features/LateRegistrationConfirmDialog'
import { getRegistrationAvailability } from '@/lib/contestRegistration'
import { useContestDetail, useRegisterToContest, useUnregisterFromContest, useDeleteContest, useUpdateContest, useStandings } from '@/hooks/api/useContests'
import { useGroupDetail } from '@/hooks/api/useGroups'
import { useProblemSearch } from '@/hooks/api/useProblems'
import { useDebounce } from '@/hooks/useDebounce'
import { useMyTeams, useTeamRegistrationEligibility, useRegisterTeamToContest, useUpdateTeamRegistration, useUnregisterTeamFromContest, useContestTeamRegistrations } from '@/hooks/api/useTeams'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/hooks/useToastContext'
import { getErrorMessage } from '@/lib/errorMessages'
import { isGroupLeadOrAdmin } from '@/lib/permissions'
import { PATHS } from '@/lib/constants'
import { formatDateTz, formatDuration, participationModeLabel, problemLabel, pluralize } from '@/lib/utils'
import { DEFAULT_BALLOON_COLOR } from '@/lib/balloon'
import { buildColorUpdatePayload } from '@/lib/contestProblems'
import { ApiClientError, isNotFoundError } from '@/lib/errors'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import { ErrorPage } from '@/pages/errors/ErrorPage'
import type { User as AuthUser } from '@/types/user'

type ContestDetailData = NonNullable<ReturnType<typeof useContestDetail>['data']>
type GroupDetailData = NonNullable<ReturnType<typeof useGroupDetail>['data']>
type TeamRegistrationsData = NonNullable<ReturnType<typeof useContestTeamRegistrations>['data']>
type StandingsData = NonNullable<ReturnType<typeof useStandings>['data']>
type Breadcrumb = { label: string; href?: string }

function LockedProblemsPlaceholder({
  title = 'Los problemas se revelarán al iniciar la competencia',
  description = 'Solo los participantes registrados podrán ver los enunciados una vez comience la competencia.',
  showSkeleton = true,
}: {
  title?: string
  description?: string
  showSkeleton?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-16 h-16 bg-neutral-background rounded-full flex items-center justify-center mb-4">
        <EyeOff className="h-7 w-7 text-neutral-text-muted" />
      </div>
      <h4 className="text-base font-bold text-neutral-text-primary mb-1">
        {title}
      </h4>
      <p className="text-sm text-neutral-text-muted max-w-sm">
        {description}
      </p>
      {showSkeleton && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-lg">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-neutral-background rounded-lg animate-pulse" />
          ))}
        </div>
      )}
    </div>
  )
}

function ModalityRow({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-2.5 bg-neutral-background rounded-lg">
      <Icon className="h-4 w-4 text-brand-primary" />
      <span className="text-sm font-semibold">{children}</span>
    </div>
  )
}

// ───────────────────────────── permissions and registration state ─────────────────────────────

type RegistrationBlock = 'admin' | 'lead' | 'nonmember' | null

/**
 * Same rules as register_to_contest.go: admins and group leads organize, they can't compete,
 * and only group members can register. Without this they'd see "Registrarse" and get a 403.
 */
function registrationBlockOf(userRole: AuthUser['role'] | undefined, ownerGroup: GroupDetailData | undefined): RegistrationBlock {
  if (userRole === 'ADMIN') return 'admin'
  if (ownerGroup?.userMembership.role === 'LEAD') return 'lead'
  if (ownerGroup && !ownerGroup.userMembership.isMember) return 'nonmember'
  return null
}

interface RegistrationState {
  block: RegistrationBlock
  /** Suppresses the CTAs until the group membership is known, so they don't flash for leads/admins/non-members. */
  groupMembershipKnown: boolean
  availability: ReturnType<typeof getRegistrationAvailability>
  offersIndividualRegistration: boolean
  canRegisterIndividual: boolean
  showTeamRegistration: boolean
  /** Excludes team registrations: those show their own status/actions in TeamContestRegistration. */
  canUnregister: boolean
}

function registrationStateOf(
  contest: ContestDetailData,
  userRole: AuthUser['role'] | undefined,
  ownerGroup: GroupDetailData | undefined,
  hasTeamRegistration: boolean,
): RegistrationState {
  const block = registrationBlockOf(userRole, ownerGroup)
  const groupMembershipKnown = ownerGroup !== undefined
  const availability = getRegistrationAvailability(contest)
  const offersIndividualRegistration = availability !== 'closed' && !contest.isRegistered &&
    (contest.participationMode === 'INDIVIDUAL' || contest.participationMode === 'MIXED')
  return {
    block,
    groupMembershipKnown,
    availability,
    offersIndividualRegistration,
    canRegisterIndividual: groupMembershipKnown && offersIndividualRegistration && !block,
    showTeamRegistration: groupMembershipKnown && contest.participationMode !== 'INDIVIDUAL' && !block,
    canUnregister: contest.status === 'SCHEDULED' && contest.isRegistered && !hasTeamRegistration,
  }
}

/** The current user's own row in the standings (as a person, or through the team they play with). */
function findMyStanding(
  standings: StandingsData | undefined,
  myTeamId: string | undefined,
  nickname: string | undefined,
) {
  return standings?.standings.find((entry) =>
    entry.participant.type === 'TEAM' ? entry.participant.id === myTeamId : entry.participant.nickname === nickname,
  )
}

// ───────────────────────────── actions (one hook per concern) ─────────────────────────────

/** Individual registration: register (asking for confirmation when it is late) and cancel it. */
function useIndividualRegistration(groupId: string, contestId: string, contest: ContestDetailData | undefined) {
  const { toast } = useToastContext()
  const registerMutation = useRegisterToContest()
  const unregisterMutation = useUnregisterFromContest()
  const [lateConfirmOpen, setLateConfirmOpen] = useState(false)

  const register = () => {
    registerMutation.mutate(
      { groupId, contestId },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Registrado', description: 'Te has registrado a la competencia' }),
        onError: (err) => toast({ variant: 'error', title: 'Error', description: getErrorMessage(err) }),
      },
    )
  }

  const handleRegisterClick = () => {
    if (!contest) return
    // El contador puede llegar a startTime antes de que el refetch actualice el estado: si ya empezó
    // con inscripción tardía habilitada, el servidor la tratará como tardía, así que se confirma igual.
    const startedWithLateRegistration = contest.allowLateRegistration && new Date(contest.startTime).getTime() <= Date.now()
    if (getRegistrationAvailability(contest) === 'late' || startedWithLateRegistration) setLateConfirmOpen(true)
    else register()
  }

  const handleConfirmLateRegister = () => {
    setLateConfirmOpen(false)
    register()
  }

  const handleUnregister = () => {
    unregisterMutation.mutate(
      { groupId, contestId },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Desregistrado', description: 'Has cancelado tu registro' }),
        onError: (err) => toast({ variant: 'error', title: 'Error', description: getErrorMessage(err) }),
      },
    )
  }

  return {
    lateConfirmOpen,
    setLateConfirmOpen,
    handleRegisterClick,
    handleConfirmLateRegister,
    handleUnregister,
    isRegistering: registerMutation.isPending,
    isUnregistering: unregisterMutation.isPending,
  }
}

/** Team registration: the user's teams, the eligibility of the picked team and the register/update/cancel actions. */
function useTeamRegistration(groupId: string, contestId: string, nickname: string | undefined) {
  const { toast } = useToastContext()
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const { data: teamsData, isLoading: isLoadingTeams } = useMyTeams()
  const {
    data: eligibility,
    isFetching: isFetchingEligibility,
    isError: isEligibilityError,
    refetch: refetchEligibility,
  } = useTeamRegistrationEligibility(groupId, contestId, selectedTeamId)
  const { data: teamRegistrationsData } = useContestTeamRegistrations(groupId, contestId)
  const registerTeamMutation = useRegisterTeamToContest()
  const updateTeamRegistrationMutation = useUpdateTeamRegistration()
  const unregisterTeamMutation = useUnregisterTeamFromContest()

  // Scoped to the roster of this specific registration, not general team membership — a team
  // member left out of the selected lineup (e.g. didn't play that day) has no say over it, and
  // if the same person competes via a different team for this contest, that's a separate registration.
  const myRegistration = findMyRegistration(teamRegistrationsData, nickname)

  const handleRegisterTeam = (teamId: string, selectedMembers: string[]) => {
    registerTeamMutation.mutate(
      { groupId, contestId, teamId, selectedMembers },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Equipo registrado', description: 'Tu equipo fue registrado a la competencia' }),
        onError: (err) => toast({ variant: 'error', title: 'Error', description: getErrorMessage(err, 'No se pudo registrar el equipo') }),
      },
    )
  }

  const handleUpdateTeamRegistration = (teamId: string, selectedMembers: string[]) => {
    updateTeamRegistrationMutation.mutate(
      { groupId, contestId, teamId, data: { selectedMembers } },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Alineación actualizada', description: 'Los miembros del equipo fueron actualizados' }),
        onError: (err) => toast({ variant: 'error', title: 'Error', description: getErrorMessage(err, 'No se pudo actualizar la alineación') }),
      },
    )
  }

  const handleUnregisterTeam = (teamId: string) => {
    unregisterTeamMutation.mutate(
      { groupId, contestId, teamId },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Equipo desregistrado', description: 'Tu equipo fue removido de la competencia' }),
        onError: (err) => toast({ variant: 'error', title: 'Error', description: getErrorMessage(err) }),
      },
    )
  }

  return {
    myRegistration,
    // Props of <TeamContestRegistration/> that come from the team queries and actions.
    registrationProps: {
      teams: teamsData?.teams ?? [],
      isLoadingTeams,
      eligibility,
      // Covers retries after an error too, where isLoading stays false.
      isLoadingEligibility: isFetchingEligibility && !eligibility,
      isFetchingEligibility,
      eligibilityFailed: isEligibilityError && !isFetchingEligibility && !eligibility,
      onRetryEligibility: () => refetchEligibility(),
      myRegistration,
      onRegisterTeam: handleRegisterTeam,
      onUpdateTeamRegistration: handleUpdateTeamRegistration,
      onUnregisterTeam: handleUnregisterTeam,
      isRegistering: registerTeamMutation.isPending,
      isUpdating: updateTeamRegistrationMutation.isPending,
      isUnregistering: unregisterTeamMutation.isPending,
      registrationError: registerTeamMutation.error ? getErrorMessage(registerTeamMutation.error) : undefined,
      onTeamSelect: setSelectedTeamId,
    },
  }
}

function findMyRegistration(registrations: TeamRegistrationsData | undefined, nickname: string | undefined) {
  return registrations?.teams.find((r) => r.selectedMembers.some((m) => m.nickname === nickname))
}

/** Lock/unlock, delete, the problem list and the balloon colors: every change that writes the contest. */
function useContestManagement(
  groupId: string,
  contestId: string,
  contest: ContestDetailData | undefined,
  refetchContest: () => Promise<unknown>,
  onProblemAdded: () => void,
) {
  const { toast } = useToastContext()
  const navigate = useNavigate()
  const deleteMutation = useDeleteContest()
  const updateMutation = useUpdateContest()
  // Instancia propia para los colores: si compartiera estado con updateMutation, guardar un color
  // pondría "cargando" en el botón de bloquear y en la gestión de problemas.
  const colorMutation = useUpdateContest()
  // Un PUT con `problems` manda la lista completa: dos en vuelo a la vez harían que el último en
  // terminar pise lo del otro (p. ej. un cambio de color retrasado borraría un problema recién agregado).
  const isSavingProblems = updateMutation.isPending || colorMutation.isPending

  const handleDelete = () => {
    deleteMutation.mutate(
      { groupId, contestId },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Eliminado', description: 'Competencia eliminada' })
          navigate(PATHS.group(groupId))
        },
        onError: (err) => toast({ variant: 'error', title: 'Error', description: getErrorMessage(err) }),
      },
    )
  }

  const handleLockToggle = () => {
    if (!contest) return
    const newLocked = !contest.locked
    updateMutation.mutate(
      { groupId, contestId, data: { locked: newLocked } },
      {
        onSuccess: () => toast({
          variant: 'success',
          title: newLocked ? 'Bloqueado' : 'Desbloqueado',
          description: newLocked ? 'La competencia fue bloqueada' : 'La competencia fue desbloqueada',
        }),
        onError: (err) => toast({
          variant: 'error',
          title: newLocked ? 'No se pudo bloquear' : 'No se pudo desbloquear',
          description: getErrorMessage(err),
        }),
      },
    )
  }

  const handleAddProblem = (slug: string) => {
    if (!contest || !slug.trim() || isSavingProblems) return
    // Los ya existentes van sin `color` (el backend conserva el suyo); el nuevo entra en blanco.
    const newProblems = [
      ...contest.problems.map((p) => ({ slug: p.slug, order: p.position })),
      { slug, order: contest.problems.length + 1, color: DEFAULT_BALLOON_COLOR },
    ]
    updateMutation.mutate(
      { groupId, contestId, data: { problems: newProblems } },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Problema agregado', description: `Se agregó "${slug}" a la competencia` })
          onProblemAdded()
        },
        onError: (err) => toast({ variant: 'error', title: 'Error', description: getErrorMessage(err) }),
      },
    )
  }

  const handleRemoveProblem = (slug: string) => {
    if (!contest || isSavingProblems) return
    const remaining = contest.problems
      .filter((p) => p.slug !== slug)
      .map((p, i) => ({ slug: p.slug, order: i + 1 }))
    updateMutation.mutate(
      { groupId, contestId, data: { problems: remaining } },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Problema removido', description: `Se removió "${slug}" de la competencia` }),
        onError: (err) => toast({ variant: 'error', title: 'Error', description: getErrorMessage(err) }),
      },
    )
  }

  const handleColorChange = (slug: string, color: string) => {
    const target = contest?.problems.find((p) => p.slug === slug)
    const problems = contest && buildColorUpdatePayload(contest.problems, { [slug]: color })
    if (!target || !problems) return
    const letter = problemLabel(target.position)
    colorMutation.mutate(
      { groupId, contestId, data: { problems } },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Color guardado', description: `Se actualizó el color del problema ${letter}` }),
        onError: (err) => {
          toast({ variant: 'error', title: 'No se pudo guardar el color', description: getErrorMessage(err) })
          if (err instanceof ApiClientError && err.code === 'CONTEST_CONFLICT') void refetchContest()
        },
      },
    )
  }

  return {
    isSavingProblems,
    isUpdating: updateMutation.isPending,
    isSavingColor: colorMutation.isPending,
    isDeleting: deleteMutation.isPending,
    handleDelete,
    handleLockToggle,
    handleAddProblem,
    handleRemoveProblem,
    handleColorChange,
  }
}

type ContestManagement = ReturnType<typeof useContestManagement>

// ───────────────────────────── small presentational pieces ─────────────────────────────

function ContestTitle({ contest }: Readonly<{ contest: ContestDetailData }>) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <ContestStatusBadge status={contest.status} />
        <span className="text-sm font-medium text-neutral-text-muted">{contest.group.name}</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-text-primary tracking-tight">
        {contest.name}
      </h1>
    </div>
  )
}

function ParticipantsStat({ count }: Readonly<{ count: number }>) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-text-muted leading-none mb-1">Participantes</p>
      <p className="text-lg font-extrabold text-neutral-text-primary">{count}</p>
    </div>
  )
}

function HeaderStatsBox({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex items-center gap-4 bg-neutral-surface border border-neutral-border rounded-xl px-5 py-3 shadow-sm">
      {children}
    </div>
  )
}

function MyStandingCard({ standing, participantCount }: Readonly<{ standing: StandingsData['standings'][number]; participantCount: number }>) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-[10px] font-semibold text-neutral-text-muted uppercase tracking-widest mb-3">Tu posición actual</p>
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-3xl font-extrabold text-brand-primary tracking-tight">#{standing.rank}</span>
          <span className="text-sm text-neutral-text-muted font-medium">/ {participantCount}</span>
        </div>
        <div className="flex gap-2">
          <span className="px-2.5 py-1 bg-status-success/10 text-status-success text-xs font-bold rounded-md">
            {standing.problemsSolved} Resueltos
          </span>
          <span className="px-2.5 py-1 bg-neutral-background text-neutral-text-muted text-xs font-bold rounded-md">
            {standing.totalPenalty} min
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function LockToggleCard({ contest, management }: Readonly<{ contest: ContestDetailData; management: ContestManagement }>) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={management.handleLockToggle}
          isLoading={management.isUpdating}
          disabled={management.isSavingColor}
        >
          {contest.locked ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
          {contest.locked ? 'Desbloquear competencia' : 'Bloquear competencia'}
        </Button>
      </CardContent>
    </Card>
  )
}

function InfoItem({ icon: Icon, label, children }: Readonly<{ icon: LucideIcon; label: string; children: ReactNode }>) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2.5 bg-neutral-background rounded-lg">
        <Icon className="h-5 w-5 text-neutral-text-muted" />
      </div>
      <div>
        <p className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">{label}</p>
        {children}
      </div>
    </div>
  )
}

function ContestInfoCard({ contest }: Readonly<{ contest: ContestDetailData }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del concurso</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InfoItem icon={Calendar} label="Fecha y hora">
            <p className="text-sm font-semibold text-neutral-text-primary">{formatDateTz(contest.startTime)}</p>
            <p className="text-xs text-neutral-text-muted">hasta {formatDateTz(contest.endTime, { short: true })}</p>
          </InfoItem>
          <InfoItem icon={Clock} label="Duración">
            <p className="text-sm font-semibold text-neutral-text-primary">{formatDuration(contest.duration)}</p>
            <p className="text-xs text-neutral-text-muted">Tiempo continuo</p>
          </InfoItem>
          <InfoItem icon={Users} label="Participantes">
            <p className="text-sm font-semibold text-neutral-text-primary">{pluralize(contest.participantCount, 'inscrito')}</p>
          </InfoItem>
          <InfoItem icon={Trophy} label="Penalización">
            <p className="text-sm font-semibold text-neutral-text-primary">{contest.penalty} minutos</p>
            <p className="text-xs text-neutral-text-muted">Por envío incorrecto</p>
          </InfoItem>
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
  )
}

function ModalityCard({ contest }: Readonly<{ contest: ContestDetailData }>) {
  const hasTeamSize = contest.participationMode !== 'INDIVIDUAL' && contest.teamSizeMin && contest.teamSizeMax
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Modalidad</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <ModalityRow icon={Swords}>{participationModeLabel(contest.participationMode)}</ModalityRow>
        {hasTeamSize && (
          <ModalityRow icon={UsersRound}>{contest.teamSizeMin}–{contest.teamSizeMax} miembros por equipo</ModalityRow>
        )}
        {contest.freezeMinutes != null && (
          <ModalityRow icon={Lock}>Freeze: {contest.freezeMinutes} min</ModalityRow>
        )}
        {contest.enablePostContest && (
          <ModalityRow icon={Globe}>Post-competencia habilitada</ModalityRow>
        )}
        {contest.allowLateRegistration && <ModalityRow icon={UserPlus}>Inscripción tardía habilitada</ModalityRow>}
      </CardContent>
    </Card>
  )
}

interface RegistrationActionsProps {
  contest: ContestDetailData
  groupId: string
  state: RegistrationState
  ownerGroup: GroupDetailData | undefined
  groupError: unknown
  onRetryGroup: () => void
  individual: ReturnType<typeof useIndividualRegistration>
  team: ReturnType<typeof useTeamRegistration>
  currentUserNickname: string | undefined
}

/** Registration buttons: shown in the hero (SCHEDULED) and in the side card (ACTIVE with late registration). */
function RegistrationActions({
  contest, groupId, state, ownerGroup, groupError, onRetryGroup, individual, team, currentUserNickname,
}: Readonly<RegistrationActionsProps>) {
  const { block, groupMembershipKnown } = state
  return (
    <>
      {!groupMembershipKnown && !groupError && (
        <div className="h-11 w-36 bg-neutral-background animate-pulse rounded-pill" />
      )}
      {!groupMembershipKnown && !!groupError && (
        <div className="flex items-center gap-2 text-sm text-neutral-text-muted">
          <span>No se pudo cargar tu membresía.</span>
          <button
            onClick={onRetryGroup}
            className="underline hover:text-neutral-text-primary transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}
      {state.canRegisterIndividual && (
        <Button variant="primary" size="lg" onClick={individual.handleRegisterClick} isLoading={individual.isRegistering}>
          <User className="h-4 w-4 mr-2" />
          Registrarse
        </Button>
      )}
      {state.offersIndividualRegistration && block === 'nonmember' && (
        <p className="text-sm text-neutral-text-muted self-center">
          Para registrarte, primero únete al grupo{' '}
          <Link to={PATHS.group(groupId)} className="font-semibold text-brand-primary hover:underline">
            {ownerGroup?.name}
          </Link>
          .
        </p>
      )}
      {state.offersIndividualRegistration && (block === 'admin' || block === 'lead') && (
        <p className="text-sm text-neutral-text-muted self-center">
          {block === 'admin'
            ? 'Los administradores no participan en competencias.'
            : 'Como líder del grupo organizas esta competencia, así que no puedes registrarte.'}
        </p>
      )}
      {state.showTeamRegistration && (
        <TeamContestRegistration
          contestId={contest.id}
          contestStatus={contest.status}
          allowLateRegistration={contest.allowLateRegistration}
          participationMode={contest.participationMode}
          teamSizeMin={contest.teamSizeMin}
          teamSizeMax={contest.teamSizeMax}
          isRegistered={contest.isRegistered}
          variant="inline"
          currentUserNickname={currentUserNickname}
          {...team.registrationProps}
        />
      )}
      {state.canUnregister && (
        <Button variant="outline" size="lg" onClick={individual.handleUnregister} isLoading={individual.isUnregistering}>
          Cancelar registro
        </Button>
      )}
      {contest.isRegistered && !team.myRegistration && (
        <Badge variant="success" className="self-center text-sm px-4 py-2">Registrado</Badge>
      )}
    </>
  )
}

function DeleteContestDialog({
  contest, open, onOpenChange, confirmName, onConfirmNameChange, onDelete, isDeleting,
}: Readonly<{
  contest: ContestDetailData
  open: boolean
  onOpenChange: (open: boolean) => void
  confirmName: string
  onConfirmNameChange: (value: string) => void
  onDelete: () => void
  isDeleting: boolean
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar competencia</DialogTitle>
          <DialogDescription>
            Escribe <span className="font-bold">{contest.name}</span> para confirmar la eliminación. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-md border border-status-warning/30 bg-status-warning/5 p-3 text-sm text-neutral-text-primary" role="status">
          {contest.status === 'FINISHED' && <strong>Esta competencia ya terminó: al eliminarla se pierde su tabla de posiciones, el resultado oficial. </strong>}
          Se eliminan también sus inscripciones y su lista de problemas. Los envíos ya hechos se conservan, pero quedan sin competencia.
        </p>
        <Input value={confirmName} onChange={(e) => onConfirmNameChange(e.target.value)} placeholder="Nombre de la competencia" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="danger"
            onClick={onDelete}
            isLoading={isDeleting}
            disabled={confirmName !== contest.name}
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ───────────────────────────── one layout per contest status ─────────────────────────────

interface ContestViewProps {
  contest: ContestDetailData
  groupId: string
  breadcrumbs: Breadcrumb[]
  isLead: boolean
  isContestOwner: boolean
  canEditColors: boolean
  management: ContestManagement
  registrationActions: ReactNode
  registrationAvailability: RegistrationState['availability']
  onDeleteClick: () => void
}

function ProblemsCardContent({ contest, groupId, showSubmit, view }: Readonly<{
  contest: ContestDetailData
  groupId: string
  showSubmit?: boolean
  view: ContestViewProps
}>) {
  return (
    <ContestProblemsTable
      problems={contest.problems}
      groupId={groupId}
      contestId={contest.id}
      showSubmit={showSubmit}
      onColorChange={view.canEditColors ? view.management.handleColorChange : undefined}
      colorsDisabled={view.management.isSavingProblems}
    />
  )
}

/** ACTIVE: competition mode layout. */
function ActiveContestView({ view, myStanding, onCountdownEnd }: Readonly<{
  view: ContestViewProps
  myStanding: StandingsData['standings'][number] | undefined
  onCountdownEnd: () => void
}>) {
  const { contest, groupId, isLead, registrationAvailability } = view
  const noProblemsForOutsider = contest.problems.length === 0 && !contest.isRegistered
  return (
    <AppLayout breadcrumbs={view.breadcrumbs}>
      <div className="space-y-6">
        {/* Header with compact timer */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <ContestTitle contest={contest} />
          <HeaderStatsBox>
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-brand-primary flex-shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-text-muted leading-none mb-1">Tiempo restante</p>
                <ContestCountdown targetTime={contest.endTime} onComplete={onCountdownEnd} />
              </div>
            </div>
            <div className="h-8 w-px bg-neutral-border" />
            <ParticipantsStat count={contest.participantCount} />
          </HeaderStatsBox>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-8">
            <Card className={noProblemsForOutsider ? 'border-dashed border-neutral-border' : ''}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Problemas del concurso
                  {noProblemsForOutsider && <Lock className="h-4 w-4 text-neutral-text-muted" />}
                </CardTitle>
                {noProblemsForOutsider && <Badge variant="default">Acceso restringido</Badge>}
              </CardHeader>
              <CardContent className={contest.problems.length > 0 ? 'p-0' : ''}>
                {noProblemsForOutsider ? (
                  <LockedProblemsPlaceholder
                    title="No estás inscrito en esta competencia"
                    description={
                      registrationAvailability === 'late'
                        ? 'Inscríbete para acceder a los problemas de la competencia.'
                        : 'Debiste haberte registrado antes de que iniciara para poder ver los problemas. Si crees que esto es un error, contacta a un líder del grupo.'
                    }
                    showSkeleton={false}
                  />
                ) : (
                  <ProblemsCardContent contest={contest} groupId={groupId} showSubmit={contest.isRegistered} view={view} />
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="lg:col-span-4 space-y-4">
            {registrationAvailability === 'late' && !contest.isRegistered && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Inscripción abierta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-neutral-text-muted">
                    La competencia ya comenzó, pero todavía puedes inscribirte. Una vez inscrito no podrás cancelar.
                  </p>
                  <div className="flex flex-wrap gap-3">{view.registrationActions}</div>
                </CardContent>
              </Card>
            )}
            {/* User position — first in sidebar for visibility */}
            {contest.isRegistered && myStanding && (
              <MyStandingCard standing={myStanding} participantCount={contest.participantCount} />
            )}

            <ContestInfoSidebar contest={contest} />
            <ContestQuickLinks groupId={groupId} contestId={contest.id} />

            {/* Edit only, no delete: lets a lead extend the end time or fix details mid-contest
                (HU-COM-11 "antes o durante su ejecución"); the form keeps the start time read-only. */}
            {isLead && !contest.locked && (
              <ContestAdminActions contestId={contest.id} groupId={groupId} />
            )}

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

/**
 * Problems card of a SCHEDULED contest: hidden pre-start for regular members, or genuinely empty (the
 * backend only hides problems from non-Lead/Admin while SCHEDULED — get_contest.go:123 — so for a
 * Lead/Admin, an empty list here means nobody has added any yet, not that they're locked).
 */
function ScheduledProblemsCard({ view }: Readonly<{ view: ContestViewProps }>) {
  const { contest, groupId, isLead } = view
  const isEmpty = contest.problems.length === 0
  return (
    <Card className={isEmpty ? 'border-dashed border-neutral-border' : ''}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          Problemas
          {isEmpty && !isLead && <Lock className="h-4 w-4 text-neutral-text-muted" />}
        </CardTitle>
        {isEmpty && !isLead && <Badge variant="default">Acceso restringido</Badge>}
      </CardHeader>
      <CardContent className={isEmpty ? '' : 'p-0'}>
        {!isEmpty && <ProblemsCardContent contest={contest} groupId={groupId} view={view} />}
        {isEmpty && isLead && (
          <LockedProblemsPlaceholder
            title={contest.locked ? 'Competencia bloqueada' : 'Todavía no hay problemas'}
            description={
              contest.locked
                ? 'No se pueden agregar problemas mientras la competencia esté bloqueada. Desbloquéala primero.'
                : 'Agrégalos desde "Gestión de problemas", más abajo.'
            }
            showSkeleton={false}
          />
        )}
        {isEmpty && !isLead && <LockedProblemsPlaceholder />}
      </CardContent>
    </Card>
  )
}

interface ProblemSearchProps {
  query: string
  onQueryChange: (value: string) => void
  results: { slug: string; title: string }[]
  isSearching: boolean
}

/** Problem management — Lead/Admin only, unlocked contest. */
function ProblemManagementCard({ view, search }: Readonly<{ view: ContestViewProps; search: ProblemSearchProps }>) {
  const { contest, management } = view
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de problemas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SearchSelect
          query={search.query}
          onQueryChange={search.onQueryChange}
          results={search.results.filter((p) => !contest.problems.some((cp) => cp.slug === p.slug))}
          isSearching={search.isSearching}
          placeholder="Buscar problema publicado por título..."
          emptyLabel="Sin resultados (o ya está agregado)"
          hintLabel="Escribe al menos 2 caracteres"
          getKey={(p) => p.slug}
          renderItem={(p) => (
            <div>
              <p className="font-medium text-neutral-text-primary">{p.title}</p>
              <p className="text-xs text-neutral-text-muted font-mono">{p.slug}</p>
            </div>
          )}
          onSelect={(p) => management.handleAddProblem(p.slug)}
          disabled={management.isSavingProblems}
        />
        {management.isUpdating && (
          <p className="text-xs text-neutral-text-muted">Agregando...</p>
        )}
        {contest.problems.length > 0 && (
          <ul className="divide-y divide-neutral-border">
            {contest.problems.map((p) => (
              <li key={p.slug} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-neutral-text-primary">
                  {problemLabel(p.position)}. {p.title}{' '}
                  <span className="text-neutral-text-muted">({p.slug})</span>
                </span>
                <button
                  type="button"
                  onClick={() => management.handleRemoveProblem(p.slug)}
                  disabled={management.isSavingProblems}
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
  )
}

/** Lock toggle (owner or Admin) and the edit/delete actions (lead of an unlocked contest). */
function ManagementSidebar({ view }: Readonly<{ view: ContestViewProps }>) {
  const { contest, groupId, isLead, isContestOwner, management } = view
  return (
    <>
      {isContestOwner && <LockToggleCard contest={contest} management={management} />}
      {isLead && !contest.locked && (
        <ContestAdminActions
          contestId={contest.id}
          groupId={groupId}
          onDelete={view.onDeleteClick}
          isDeleting={management.isDeleting}
        />
      )}
    </>
  )
}

/** SCHEDULED: hero countdown layout. */
function ScheduledContestView({ view, search, onCountdownEnd }: Readonly<{
  view: ContestViewProps
  search: ProblemSearchProps
  onCountdownEnd: () => void
}>) {
  const { contest, groupId, isLead } = view
  return (
    <AppLayout breadcrumbs={view.breadcrumbs}>
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
              onComplete={onCountdownEnd}
            />
            <div className="mt-8 flex flex-wrap justify-center gap-3">{view.registrationActions}</div>
          </div>
        </section>

        {/* Bento grid: info + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-6">
            <ContestInfoCard contest={contest} />
            <ScheduledProblemsCard view={view} />
            {isLead && !contest.locked && <ProblemManagementCard view={view} search={search} />}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <ModalityCard contest={contest} />
            <ContestQuickLinks groupId={groupId} contestId={contest.id} />
            <ContestOrganizerCard groupId={groupId} groupName={contest.group.name} ownerNickname={contest.owner.nickname} />
            <ManagementSidebar view={view} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

/** FINISHED: post-contest layout (same structure as ACTIVE). */
function FinishedContestView({ view }: Readonly<{ view: ContestViewProps }>) {
  const { contest, groupId } = view
  return (
    <AppLayout breadcrumbs={view.breadcrumbs}>
      <div className="space-y-6">
        {/* Header with finished indicator */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <ContestTitle contest={contest} />
          {/* Finished indicator — same container style as ACTIVE timer */}
          <HeaderStatsBox>
            <div className="flex items-center gap-2.5">
              <Flag className="h-4 w-4 text-neutral-text-muted flex-shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-text-muted leading-none mb-1">Finalizado</p>
                <p className="text-sm font-semibold text-neutral-text-primary">{formatDateTz(contest.endTime, { short: true })}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-neutral-border" />
            <ParticipantsStat count={contest.participantCount} />
          </HeaderStatsBox>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main content */}
          <section className="lg:col-span-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Problemas del concurso</CardTitle>
              </CardHeader>
              <CardContent className={contest.problems.length > 0 ? 'p-0' : ''}>
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
            <ContestOrganizerCard groupId={groupId} groupName={contest.group.name} ownerNickname={contest.owner.nickname} />
            <ManagementSidebar view={view} />
          </aside>
        </div>
      </div>
    </AppLayout>
  )
}

// ───────────────────────────── page ─────────────────────────────

export function ContestDetailPage() {
  const { groupId, id } = useParams<{ groupId: string; id: string }>()
  const { user } = useAuth()
  const gid = groupId ?? ''
  const contestId = id ?? ''

  const { data: contest, isLoading, error, refetch: refetchContest } = useContestDetail(gid, contestId)
  // Flip to the next state (problems visible / results) as soon as the countdown hits zero.
  const handleCountdownEnd = useCallback(() => { void refetchContest() }, [refetchContest])
  const { data: ownerGroup, error: groupError, refetch: refetchGroup } = useGroupDetail(gid)

  const [problemSearchQuery, setProblemSearchQuery] = useState('')
  const debouncedProblemSearch = useDebounce(problemSearchQuery)
  const { data: problemSearchData, isFetching: isSearchingProblems } = useProblemSearch(debouncedProblemSearch)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')

  const individual = useIndividualRegistration(gid, contestId, contest)
  const team = useTeamRegistration(gid, contestId, user?.nickname)
  const management = useContestManagement(gid, contestId, contest, refetchContest, () => setProblemSearchQuery(''))

  // Large limit so the current user's row is included regardless of their rank —
  // there's no "find me" endpoint, so we fetch the full table and search client-side.
  // Solo oficiales: la post-competencia no interesa para "tu posición" mientras la competencia está viva.
  const { data: standingsData } = useStandings(gid, contestId, { limit: 10000, phase: 'competition' }, {
    enabled: contest?.status === 'ACTIVE' && !!contest?.isRegistered,
    activeIntervalMs: 30_000,
  })
  const myStanding = findMyStanding(standingsData, team.myRegistration?.team.id, user?.nickname)

  if (!id || !groupId) return null

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={[
        { label: 'Grupos', href: '/groups' },
        { label: ownerGroup?.name ?? '...', href: PATHS.group(groupId) },
        { label: '...' },
      ]}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        </div>
      </AppLayout>
    )
  }

  if (isNotFoundError(error)) return <NotFoundPage />
  if (error) return <ErrorPage />
  if (!contest) return null

  // Real leadership of the group that owns this contest — not just having the Coach role
  // platform-wide, which the backend already rejects for management actions on contests
  // belonging to a group the Coach doesn't actually lead (update_contest.go, delete_contest.go).
  const isLead = isGroupLeadOrAdmin(user?.role, ownerGroup?.userMembership.role)
  const state = registrationStateOf(contest, user?.role, ownerGroup, !!team.myRegistration)

  const view: ContestViewProps = {
    contest,
    groupId,
    breadcrumbs: [
      { label: 'Grupos', href: '/groups' },
      { label: contest.group.name, href: PATHS.group(groupId) },
      { label: contest.name },
    ],
    isLead,
    // Locking/unlocking is restricted by the backend to the contest's actual owner (or Admin) —
    // unlike edit/delete/problem management, which accept any Lead of the group (update_contest.go).
    isContestOwner: user?.role === 'ADMIN' || contest.owner.nickname === user?.nickname,
    // El backend no deja cambiar problemas (ni colores) una vez finalizada; bloqueada tampoco se edita.
    canEditColors: isLead && !contest.locked && contest.status !== 'FINISHED',
    management,
    registrationAvailability: state.availability,
    registrationActions: (
      <RegistrationActions
        contest={contest}
        groupId={groupId}
        state={state}
        ownerGroup={ownerGroup}
        groupError={groupError}
        onRetryGroup={() => void refetchGroup()}
        individual={individual}
        team={team}
        currentUserNickname={user?.nickname}
      />
    ),
    onDeleteClick: () => {
      setConfirmName('')
      setDeleteDialogOpen(true)
    },
  }

  const lateRegistrationDialog = (
    <LateRegistrationConfirmDialog
      open={individual.lateConfirmOpen}
      onOpenChange={individual.setLateConfirmOpen}
      onConfirm={individual.handleConfirmLateRegister}
    />
  )

  const deleteDialog = (
    <DeleteContestDialog
      contest={contest}
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      confirmName={confirmName}
      onConfirmNameChange={setConfirmName}
      onDelete={management.handleDelete}
      isDeleting={management.isDeleting}
    />
  )

  if (contest.status === 'ACTIVE') {
    return (
      <>
        <ActiveContestView view={view} myStanding={myStanding} onCountdownEnd={handleCountdownEnd} />
        {lateRegistrationDialog}
      </>
    )
  }

  if (contest.status === 'SCHEDULED') {
    const search: ProblemSearchProps = {
      query: problemSearchQuery,
      onQueryChange: setProblemSearchQuery,
      results: problemSearchData?.problems ?? [],
      isSearching: isSearchingProblems,
    }
    return (
      <>
        <ScheduledContestView view={view} search={search} onCountdownEnd={handleCountdownEnd} />
        {deleteDialog}
        {lateRegistrationDialog}
      </>
    )
  }

  return (
    <>
      <FinishedContestView view={view} />
      {deleteDialog}
    </>
  )
}
