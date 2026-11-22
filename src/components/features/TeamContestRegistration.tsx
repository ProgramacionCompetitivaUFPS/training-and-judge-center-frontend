import { useState, type ReactNode } from 'react'
import { UsersRound, Check, LogOut } from 'lucide-react'
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Checkbox } from '@/components/ui/Checkbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { pluralize } from '@/lib/utils'
import { getRegistrationAvailability } from '@/lib/contestRegistration'
import { LateRegistrationConfirmDialog } from '@/components/features/LateRegistrationConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import type {
  MyTeamItem,
  ContestTeamRegistrationsResponse,
  TeamRegistrationEligibility,
  MemberIneligibilityReason,
} from '@/types/team'
import type { ContestStatus } from '@/types/contest'

type TeamRegistration = ContestTeamRegistrationsResponse['teams'][number]

const INELIGIBILITY_LABELS: Record<MemberIneligibilityReason, string> = {
  MEMBER_NOT_IN_GROUP: 'No pertenece al grupo',
  MEMBER_ALREADY_REGISTERED: 'Ya inscrito individualmente',
  MEMBER_IN_ANOTHER_TEAM: 'Ya inscrito con otro equipo',
}

interface TeamContestRegistrationProps {
  contestId: string
  contestStatus: ContestStatus
  allowLateRegistration: boolean
  participationMode: string
  teamSizeMin?: number
  teamSizeMax?: number
  isRegistered: boolean
  /** "card" renders the full Card wrapper (default). "inline" renders just a Button suitable for hero sections. */
  variant?: 'card' | 'inline'
  teams: MyTeamItem[]
  isLoadingTeams: boolean
  /** Roster of the selected team, each member flagged with whether they can be selected for this contest. */
  eligibility: TeamRegistrationEligibility | undefined
  isLoadingEligibility: boolean
  /** True during any eligibility request, including background re-checks over cached data. */
  isFetchingEligibility: boolean
  /** The eligibility check finished with an error and there's no roster to show. */
  eligibilityFailed: boolean
  onRetryEligibility: () => void
  /** The registration whose roster includes the current user — scoped by roster membership, not team membership. */
  myRegistration: TeamRegistration | undefined
  currentUserNickname: string | undefined
  onRegisterTeam: (teamId: string, selectedMembers: string[]) => void
  /** Used only for self-removal (dropping the current user from the roster), never to edit other members. */
  onUpdateTeamRegistration: (teamId: string, selectedMembers: string[]) => void
  onUnregisterTeam: (teamId: string) => void
  isRegistering: boolean
  isUpdating: boolean
  isUnregistering: boolean
  registrationError: string | undefined
  onTeamSelect: (teamId: string) => void
}

const allowsTeams = (participationMode: string) => participationMode === 'TEAM' || participationMode === 'MIXED'

/** Editing a roster always updates; a late registration needs the user's confirmation first. */
function submitAction(isEditingRoster: boolean, availability: ReturnType<typeof getRegistrationAvailability>): 'update' | 'confirm-late' | 'register' {
  if (isEditingRoster) return 'update'
  return availability === 'late' ? 'confirm-late' : 'register'
}

/** Who can still take part, and whether the current pick respects the team size and eligibility. */
function describeSelection(eligibility: TeamRegistrationEligibility | undefined, selected: string[], min: number, max: number) {
  const eligibleIds = new Set(eligibility?.members.filter((m) => m.eligible).map((m) => m.id) ?? [])
  const hasIneligibleSelected = selected.some((id) => !eligibleIds.has(id))
  return {
    eligibleIds,
    eligibleCount: eligibleIds.size,
    hasIneligibleSelected,
    isValidSelection: selected.length >= min && selected.length <= max && !hasIneligibleSelected,
  }
}

/** Adds or removes a member; adding is ignored once the team is full. */
function toggledSelection(selected: string[], memberId: string, max: number): string[] {
  if (selected.includes(memberId)) return selected.filter((id) => id !== memberId)
  return selected.length < max ? [...selected, memberId] : selected
}

interface RegisteredActionsProps {
  canLeave: boolean
  teamSizeMin: number
  onEdit: () => void
  onLeave: () => void
  onCancel: () => void
}

function RegisteredActions({ canLeave, teamSizeMin, onEdit, onLeave, onCancel }: Readonly<RegisteredActionsProps>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={onEdit}>
        <UsersRound className="h-4 w-4 mr-2" />
        Editar alineación
      </Button>
      <Button
        variant="outline"
        onClick={onLeave}
        disabled={!canLeave}
        title={canLeave ? undefined : `No puedes salir: el equipo quedaría por debajo del mínimo (${teamSizeMin})`}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Salir de esta competencia
      </Button>
      <Button variant="outline" onClick={onCancel}>
        Cancelar registro
      </Button>
    </div>
  )
}

interface RegisteredContentProps {
  registration: TeamRegistration
  variant: 'card' | 'inline'
  children: ReactNode
}

function RegisteredContent({ registration, variant, children }: Readonly<RegisteredContentProps>) {
  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success" className="text-sm px-3 py-1.5">
          Equipo registrado: {registration.team.name}
        </Badge>
        {children}
      </div>
    )
  }
  return (
    <Card className="border-brand-accent/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-brand-accent" />
          Tu equipo está registrado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-neutral-text-muted">
          <span className="font-semibold text-neutral-text-primary">{registration.team.name}</span>
          {' — '}
          {registration.selectedMembers.map((m) => m.nickname).join(', ')}
        </p>
        {children}
      </CardContent>
    </Card>
  )
}

interface RegisterEntryProps {
  variant: 'card' | 'inline'
  participationMode: string
  teamSizeMin: number
  teamSizeMax: number
  children: ReactNode
}

function RegisterEntry({ variant, participationMode, teamSizeMin, teamSizeMax, children }: Readonly<RegisterEntryProps>) {
  if (variant === 'inline') return <>{children}</>
  return (
    <Card className="border-brand-accent/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-brand-accent" />
          Registro por equipo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-neutral-text-muted mb-3">
          Esta competencia permite participación {participationMode === 'TEAM' ? 'por equipos' : 'mixta (individual o equipo)'}.
          Tamaño de equipo: {teamSizeMin}–{teamSizeMax} miembros.
        </p>
        {children}
      </CardContent>
    </Card>
  )
}

interface TeamFieldProps {
  isEditingRoster: boolean
  teamName: string | undefined
  teams: MyTeamItem[]
  selectedTeamId: string
  onSelect: (teamId: string) => void
}

function TeamField({ isEditingRoster, teamName, teams, selectedTeamId, onSelect }: Readonly<TeamFieldProps>) {
  return (
    <div>
      <label className="text-sm font-medium text-neutral-text-primary mb-1.5 block">Equipo</label>
      {isEditingRoster && <p className="text-sm font-medium text-neutral-text-primary">{teamName}</p>}
      {!isEditingRoster && teams.length === 0 && (
        <p className="text-sm text-neutral-text-muted">No tienes equipos. Crea uno primero en la sección de Equipos.</p>
      )}
      {!isEditingRoster && teams.length > 0 && (
        <Select value={selectedTeamId} onValueChange={onSelect}>
          <SelectTrigger aria-label="Equipo a registrar">
            <SelectValue placeholder="Seleccionar equipo" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} ({pluralize(t.memberCount, 'miembro')})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

interface EligibilityNoticesProps {
  isLoading: boolean
  failed: boolean
  /** The team is already registered without the user (and the user is not editing that registration). */
  teamAlreadyRegistered: boolean
  onRetry: () => void
}

function EligibilityNotices({ isLoading, failed, teamAlreadyRegistered, onRetry }: Readonly<EligibilityNoticesProps>) {
  return (
    <>
      {isLoading && <p className="text-sm text-neutral-text-muted">Cargando miembros…</p>}

      {failed && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-status-error">No se pudo verificar qué miembros pueden participar.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}

      {teamAlreadyRegistered && (
        <p className="text-sm text-status-warning">
          Este equipo ya está inscrito en esta competencia sin ti. Para sumarte, alguien de la alineación
          debe cancelar la inscripción y volver a registrar al equipo contigo.
        </p>
      )}
    </>
  )
}

interface SelectionHintProps {
  eligibleCount: number
  teamSizeMin: number
  hasIneligibleSelected: boolean
  isValidSelection: boolean
  selectedCount: number
}

function SelectionHint({ eligibleCount, teamSizeMin, hasIneligibleSelected, isValidSelection, selectedCount }: Readonly<SelectionHintProps>) {
  if (eligibleCount < teamSizeMin) {
    return (
      <p className="text-xs text-status-warning mt-1">
        Solo {eligibleCount} {eligibleCount === 1 ? 'miembro puede' : 'miembros pueden'} participar y la competencia exige al menos {teamSizeMin}.
      </p>
    )
  }
  if (hasIneligibleSelected) {
    return <p className="text-xs text-status-warning mt-1">Quita a los miembros que ya no pueden participar para continuar.</p>
  }
  if (!isValidSelection && selectedCount > 0) {
    return <p className="text-xs text-status-warning mt-1">Necesitas al menos {pluralize(teamSizeMin, 'miembro')}</p>
  }
  return null
}

interface MemberChecklistProps {
  members: TeamRegistrationEligibility['members']
  selectedMembers: string[]
  teamSizeMin: number
  teamSizeMax: number
  isValidSelection: boolean
  hasIneligibleSelected: boolean
  eligibleCount: number
  onToggle: (memberId: string) => void
}

function MemberChecklist({
  members, selectedMembers, teamSizeMin, teamSizeMax, isValidSelection, hasIneligibleSelected, eligibleCount, onToggle,
}: Readonly<MemberChecklistProps>) {
  return (
    <div>
      <label className="text-sm font-medium text-neutral-text-primary mb-1.5 block">
        Miembros participantes
        <Badge variant={isValidSelection ? 'success' : 'default'} className="ml-2">
          {selectedMembers.length}/{teamSizeMax}
        </Badge>
      </label>
      <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border border-neutral-border p-2">
        {members.map((member) => {
          const isSelected = selectedMembers.includes(member.id)
          // A selected member always stays toggleable so they can be removed if they turn ineligible.
          const isDisabled = !isSelected && (!member.eligible || selectedMembers.length >= teamSizeMax)
          return (
            <label
              key={member.id}
              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                isSelected ? 'bg-brand-primary/5' : 'hover:bg-neutral-background'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => !isDisabled && onToggle(member.id)}
                disabled={isDisabled}
              />
              <span className="text-sm font-medium text-neutral-text-primary">{member.nickname}</span>
              {!member.eligible && (
                <span className="text-xs text-neutral-text-muted ml-auto">
                  {(member.reason && INELIGIBILITY_LABELS[member.reason]) || 'No puede participar'}
                </span>
              )}
              {isSelected && <Check className="h-3.5 w-3.5 text-status-success ml-auto" />}
            </label>
          )
        })}
      </div>
      <SelectionHint
        eligibleCount={eligibleCount}
        teamSizeMin={teamSizeMin}
        hasIneligibleSelected={hasIneligibleSelected}
        isValidSelection={isValidSelection}
        selectedCount={selectedMembers.length}
      />
    </div>
  )
}

export function TeamContestRegistration({
  contestStatus,
  allowLateRegistration,
  participationMode,
  teamSizeMin = 1,
  teamSizeMax = 5,
  isRegistered,
  variant = 'card',
  teams,
  eligibility,
  isLoadingEligibility,
  isFetchingEligibility,
  eligibilityFailed,
  onRetryEligibility,
  myRegistration,
  currentUserNickname,
  onRegisterTeam,
  onUpdateTeamRegistration,
  onUnregisterTeam,
  isRegistering,
  isUpdating,
  isUnregistering,
  onTeamSelect,
}: TeamContestRegistrationProps) {
  const [showDialog, setShowDialog] = useState(false)
  // Reuses the same dialog as registering (HU: "modificar miembros seleccionados mientras esté
  // programada", P1) — same team-size checks, same per-member eligibility, just prefilled with
  // the current roster and PATCHing instead of POSTing. teamAlreadyRegistered from the
  // eligibility check is expected to be true here (that's the whole premise), so it must not
  // block submission the way it does for a fresh registration.
  const [isEditingRoster, setIsEditingRoster] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [cancelOpen, setCancelOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [pendingLateRegistration, setPendingLateRegistration] = useState<{ teamId: string; members: string[] } | null>(null)

  const availability = getRegistrationAvailability({ status: contestStatus, allowLateRegistration })
  const canRegisterTeam = availability !== 'closed' && !isRegistered && !myRegistration && allowsTeams(participationMode)
  const canManageRegistration = contestStatus === 'SCHEDULED' && !!myRegistration

  if (!canRegisterTeam && !canManageRegistration) return null

  const toggleMember = (memberId: string) => setSelectedMembers((prev) => toggledSelection(prev, memberId, teamSizeMax))

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId)
    setSelectedMembers([])
    onTeamSelect(teamId)
  }

  const openRegisterDialog = () => {
    setIsEditingRoster(false)
    setSelectedTeamId('')
    setSelectedMembers([])
    // Clear the parent's team too, so re-picking the same team re-runs the eligibility check.
    onTeamSelect('')
    setShowDialog(true)
  }

  const openEditRosterDialog = () => {
    if (!myRegistration) return
    setIsEditingRoster(true)
    setSelectedTeamId(myRegistration.team.id)
    setSelectedMembers(myRegistration.selectedMembers.map((m) => m.id))
    onTeamSelect(myRegistration.team.id)
    setShowDialog(true)
  }

  const handleSubmitDialog = () => {
    if (!selectedTeamId || selectedMembers.length === 0) return
    const action = submitAction(isEditingRoster, availability)
    if (action === 'update') onUpdateTeamRegistration(selectedTeamId, selectedMembers)
    else if (action === 'confirm-late') setPendingLateRegistration({ teamId: selectedTeamId, members: selectedMembers })
    else onRegisterTeam(selectedTeamId, selectedMembers)
    setShowDialog(false)
    setSelectedTeamId('')
    setSelectedMembers([])
  }

  const handleCancelRegistration = () => {
    if (!myRegistration) return
    onUnregisterTeam(myRegistration.team.id)
    setCancelOpen(false)
  }

  const myMemberId = myRegistration?.selectedMembers.find((m) => m.nickname === currentUserNickname)?.id
  const rosterSizeAfterLeaving = (myRegistration?.selectedMembers.length ?? 0) - 1
  const canLeaveRoster = rosterSizeAfterLeaving >= teamSizeMin

  const handleLeaveRoster = () => {
    if (!myRegistration || !myMemberId) return
    onUpdateTeamRegistration(
      myRegistration.team.id,
      myRegistration.selectedMembers.filter((m) => m.id !== myMemberId).map((m) => m.id),
    )
    setLeaveOpen(false)
  }

  const { eligibleIds, eligibleCount, hasIneligibleSelected, isValidSelection } = describeSelection(eligibility, selectedMembers, teamSizeMin, teamSizeMax)

  // La elegibilidad pudo cambiar (refetch, reconexión) mientras el aviso estaba abierto: si hay una
  // consulta en curso o algún miembro dejó de ser elegible, no se envía y se vuelve al selector con
  // la selección conservada, donde el botón de inscribir ya refleja el estado actual.
  const handleConfirmLateRegistration = () => {
    if (!pendingLateRegistration) return
    const { teamId, members } = pendingLateRegistration
    setPendingLateRegistration(null)
    if (isFetchingEligibility || members.some((id) => !eligibleIds.has(id))) {
      setSelectedTeamId(teamId)
      setSelectedMembers(members)
      setShowDialog(true)
      return
    }
    onRegisterTeam(teamId, members)
  }

  const registerTrigger = (
    <Button variant={variant === 'inline' ? 'outline' : 'primary'} size={variant === 'inline' ? 'lg' : 'md'} onClick={openRegisterDialog}>
      <UsersRound className="h-4 w-4 mr-2" />
      Registrar equipo
    </Button>
  )

  const registeredActions = myRegistration && (
    <RegisteredActions
      canLeave={canLeaveRoster}
      teamSizeMin={teamSizeMin}
      onEdit={openEditRosterDialog}
      onLeave={() => setLeaveOpen(true)}
      onCancel={() => setCancelOpen(true)}
    />
  )

  return (
    <>
      {canManageRegistration && myRegistration && (
        <RegisteredContent registration={myRegistration} variant={variant}>{registeredActions}</RegisteredContent>
      )}
      {!canManageRegistration && (
        <RegisterEntry variant={variant} participationMode={participationMode} teamSizeMin={teamSizeMin} teamSizeMax={teamSizeMax}>
          {registerTrigger}
        </RegisterEntry>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditingRoster ? 'Editar alineación' : 'Registrar equipo a la competencia'}</DialogTitle>
            <DialogDescription>
              {isEditingRoster
                ? `Ajusta quién participa con "${myRegistration?.team.name}" (${teamSizeMin}–${teamSizeMax} miembros).`
                : `Selecciona tu equipo y los miembros que participarán (${teamSizeMin}–${teamSizeMax} miembros).`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <TeamField
              isEditingRoster={isEditingRoster}
              teamName={myRegistration?.team.name}
              teams={teams}
              selectedTeamId={selectedTeamId}
              onSelect={handleTeamSelect}
            />

            {selectedTeamId && (
              <EligibilityNotices
                isLoading={isLoadingEligibility}
                failed={eligibilityFailed}
                teamAlreadyRegistered={!!eligibility?.teamAlreadyRegistered && !isEditingRoster}
                onRetry={onRetryEligibility}
              />
            )}

            {selectedTeamId && eligibility && (!eligibility.teamAlreadyRegistered || isEditingRoster) && (
              <MemberChecklist
                members={eligibility.members}
                selectedMembers={selectedMembers}
                teamSizeMin={teamSizeMin}
                teamSizeMax={teamSizeMax}
                isValidSelection={isValidSelection}
                hasIneligibleSelected={hasIneligibleSelected}
                eligibleCount={eligibleCount}
                onToggle={toggleMember}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitDialog}
              isLoading={isEditingRoster ? isUpdating : isRegistering}
              // Wait for any re-check to land so a selection made against cached eligibility can't be submitted.
              // teamAlreadyRegistered is expected (and ignored) while editing — that's the whole premise.
              disabled={!isValidSelection || !selectedTeamId || (!isEditingRoster && !!eligibility?.teamAlreadyRegistered) || isFetchingEligibility}
            >
              {isEditingRoster ? 'Guardar cambios' : 'Registrar equipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Salir de esta competencia"
        description={`Dejarás de participar con "${myRegistration?.team.name}" en esta competencia. El resto del equipo sigue registrado. ¿Continuar?`}
        confirmLabel="Salir"
        variant="warning"
        onConfirm={handleLeaveRoster}
        isLoading={isUpdating}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar registro del equipo"
        description={`¿Seguro que deseas cancelar el registro de "${myRegistration?.team.name}" a esta competencia? Esto afecta a todo el equipo, no solo a ti. Deberán registrarse de nuevo si cambian de opinión.`}
        confirmLabel="Cancelar registro"
        variant="warning"
        onConfirm={handleCancelRegistration}
        isLoading={isUnregistering}
      />

      <LateRegistrationConfirmDialog
        open={pendingLateRegistration !== null}
        onOpenChange={(open) => { if (!open) setPendingLateRegistration(null) }}
        onConfirm={handleConfirmLateRegistration}
      />
    </>
  )
}
