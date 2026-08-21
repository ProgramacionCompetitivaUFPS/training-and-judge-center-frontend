import { useState } from 'react'
import { UsersRound, Check, LogOut } from 'lucide-react'
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Checkbox } from '@/components/ui/Checkbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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
import type { MyTeamItem, TeamDetail, ContestTeamRegistrationsResponse } from '@/types/team'

type TeamRegistration = ContestTeamRegistrationsResponse['teams'][number]

interface TeamContestRegistrationProps {
  contestId: string
  contestStatus: string
  participationMode: string
  teamSizeMin?: number
  teamSizeMax?: number
  isRegistered: boolean
  /** "card" renders the full Card wrapper (default). "inline" renders just a Button suitable for hero sections. */
  variant?: 'card' | 'inline'
  teams: MyTeamItem[]
  isLoadingTeams: boolean
  selectedTeamDetail: TeamDetail | undefined
  isLoadingTeamDetail: boolean
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

export function TeamContestRegistration({
  contestStatus,
  participationMode,
  teamSizeMin = 1,
  teamSizeMax = 5,
  isRegistered,
  variant = 'card',
  teams,
  selectedTeamDetail,
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
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [cancelOpen, setCancelOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)

  const canRegisterTeam = contestStatus === 'SCHEDULED' && !isRegistered && !myRegistration &&
    (participationMode === 'TEAM' || participationMode === 'MIXED')
  const canManageRegistration = contestStatus === 'SCHEDULED' && !!myRegistration

  if (!canRegisterTeam && !canManageRegistration) return null

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : prev.length < teamSizeMax
          ? [...prev, memberId]
          : prev
    )
  }

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId)
    setSelectedMembers([])
    onTeamSelect(teamId)
  }

  const openRegisterDialog = () => {
    setSelectedTeamId('')
    setSelectedMembers([])
    setShowDialog(true)
  }

  const handleRegister = () => {
    if (!selectedTeamId || selectedMembers.length === 0) return
    onRegisterTeam(selectedTeamId, selectedMembers)
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

  const isValidSelection = selectedMembers.length >= teamSizeMin && selectedMembers.length <= teamSizeMax

  const registerTrigger = (
    <Button variant={variant === 'inline' ? 'outline' : 'primary'} size={variant === 'inline' ? 'lg' : 'md'} onClick={openRegisterDialog}>
      <UsersRound className="h-4 w-4 mr-2" />
      Registrar equipo
    </Button>
  )

  const registeredActions = myRegistration && (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        onClick={() => setLeaveOpen(true)}
        disabled={!canLeaveRoster}
        title={!canLeaveRoster ? `No puedes salir: el equipo quedaría por debajo del mínimo (${teamSizeMin})` : undefined}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Salir de esta competencia
      </Button>
      <Button variant="outline" onClick={() => setCancelOpen(true)}>
        Cancelar registro
      </Button>
    </div>
  )

  const registeredContent = myRegistration && (
    variant === 'inline' ? (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success" className="text-sm px-3 py-1.5">
          Equipo registrado: {myRegistration.team.name}
        </Badge>
        {registeredActions}
      </div>
    ) : (
      <Card className="border-brand-accent/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-brand-accent" />
            Tu equipo está registrado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-neutral-text-muted">
            <span className="font-semibold text-neutral-text-primary">{myRegistration.team.name}</span>
            {' — '}
            {myRegistration.selectedMembers.map((m) => m.nickname).join(', ')}
          </p>
          {registeredActions}
        </CardContent>
      </Card>
    )
  )

  return (
    <>
      {canManageRegistration ? registeredContent : (
        variant === 'inline' ? (
          registerTrigger
        ) : (
          <Card className="border-brand-accent/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-brand-accent" />
                Registro por equipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-text-muted mb-3">
                Este contest permite participación {participationMode === 'TEAM' ? 'por equipos' : 'mixta (individual o equipo)'}.
                Tamaño de equipo: {teamSizeMin}–{teamSizeMax} miembros.
              </p>
              {registerTrigger}
            </CardContent>
          </Card>
        )
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar equipo al contest</DialogTitle>
            <DialogDescription>
              Selecciona tu equipo y los miembros que participarán ({teamSizeMin}–{teamSizeMax} miembros).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-neutral-text-primary mb-1.5 block">Equipo</label>
              {teams.length === 0 ? (
                <p className="text-sm text-neutral-text-muted">No tienes equipos. Crea uno primero en la sección de Equipos.</p>
              ) : (
                <Select value={selectedTeamId} onValueChange={handleTeamSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.memberCount} miembros)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Member selection */}
            {selectedTeamId && selectedTeamDetail && (
              <div>
                <label className="text-sm font-medium text-neutral-text-primary mb-1.5 block">
                  Miembros participantes
                  <Badge variant={isValidSelection ? 'success' : 'default'} className="ml-2">
                    {selectedMembers.length}/{teamSizeMax}
                  </Badge>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border border-neutral-border p-2">
                  {selectedTeamDetail.members.map((member) => {
                    const isSelected = selectedMembers.includes(member.id)
                    const isDisabled = !isSelected && selectedMembers.length >= teamSizeMax
                    return (
                      <label
                        key={member.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                          isSelected ? 'bg-brand-primary/5' : 'hover:bg-neutral-background'
                        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => !isDisabled && toggleMember(member.id)}
                          disabled={isDisabled}
                        />
                        <span className="text-sm font-medium text-neutral-text-primary">{member.nickname}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-status-success ml-auto" />}
                      </label>
                    )
                  })}
                </div>
                {!isValidSelection && selectedMembers.length > 0 && (
                  <p className="text-xs text-status-warning mt-1">
                    Necesitas al menos {teamSizeMin} miembros
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleRegister}
              isLoading={isRegistering}
              disabled={!isValidSelection || !selectedTeamId}
            >
              Registrar equipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Salir de esta competencia"
        description={`Dejarás de participar con "${myRegistration?.team.name}" en este contest. El resto del equipo sigue registrado. ¿Continuar?`}
        confirmLabel="Salir"
        variant="warning"
        onConfirm={handleLeaveRoster}
        isLoading={isUpdating}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar registro del equipo"
        description={`¿Seguro que deseas cancelar el registro de "${myRegistration?.team.name}" a este contest? Esto afecta a todo el equipo, no solo a ti. Deberán registrarse de nuevo si cambian de opinión.`}
        confirmLabel="Cancelar registro"
        variant="warning"
        onConfirm={handleCancelRegistration}
        isLoading={isUnregistering}
      />
    </>
  )
}
