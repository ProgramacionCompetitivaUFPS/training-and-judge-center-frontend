import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UsersRound, UserPlus, LogOut, Clock, Mail } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Badge } from '@/components/ui'
import { SearchSelect } from '@/components/ui/SearchSelect'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/Table'
import { Skeleton } from '@/components/ui/Skeleton'
import { useTeamDetail, useInviteTeamMember, useLeaveTeam, useTeamLeaveImpact } from '@/hooks/api/useTeams'
import { useSearchUsers } from '@/hooks/api/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/hooks/useToastContext'
import { useDebounce } from '@/hooks/useDebounce'
import { inviteTeamMemberSchema, type InviteTeamMemberFormData } from '@/lib/schemas/team'
import { ApiClientError } from '@/lib/errors'
import { getErrorMessage } from '@/lib/errorMessages'
import { PATHS } from '@/lib/constants'

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { toast } = useToastContext()
  const { user } = useAuth()
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)

  const { data: team, isLoading, error } = useTeamDetail(teamId || '')
  const inviteMember = useInviteTeamMember()
  const leaveTeam = useLeaveTeam()
  const { data: leaveImpact, isLoading: isCheckingLeave, isError: leaveImpactFailed } = useTeamLeaveImpact(teamId ?? '', showLeaveDialog)
  const registrationsToCancel = leaveImpact?.registrationsToCancel ?? []

  const form = useForm<InviteTeamMemberFormData>({
    resolver: zodResolver(inviteTeamMemberSchema),
    defaultValues: { nickname: '' },
  })
  const nicknameQuery = useWatch({ control: form.control, name: 'nickname' }) ?? ''
  const debouncedNicknameQuery = useDebounce(nicknameQuery)
  const { data: searchData, isFetching: isSearchingUsers } = useSearchUsers(debouncedNicknameQuery)

  const handleInvite = async (data: InviteTeamMemberFormData) => {
    if (!teamId) return
    try {
      await inviteMember.mutateAsync({ teamId, data })
      toast({ variant: 'success', title: 'Invitación enviada', description: `Se invitó a ${data.nickname}` })
      setShowInviteDialog(false)
      form.reset()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({ variant: 'error', title: 'Error', description: getErrorMessage(err) })
      }
    }
  }

  const handleLeave = async () => {
    if (!teamId) return
    try {
      await leaveTeam.mutateAsync(teamId)
      toast({
        variant: 'success',
        title: 'Has salido del equipo',
        description: registrationsToCancel.length
          ? `Se canceló la inscripción del equipo en: ${registrationsToCancel.map((r) => r.contestName).join(', ')}.`
          : undefined,
      })
      navigate('/teams')
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'CANNOT_LEAVE_DURING_ACTIVE_CONTEST') {
        toast({
          variant: 'error',
          title: 'No puedes salir del equipo todavía',
          description: 'Estás seleccionado en una competencia que ya está en curso. Podrás salir cuando termine.',
        })
      } else if (err instanceof ApiClientError) {
        toast({ variant: 'error', title: 'Error', description: getErrorMessage(err) })
      }
    }
  }

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Equipos', href: '/teams' }, { label: 'Cargando...' }]}>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </AppLayout>
    )
  }

  if (error || !team) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Equipos', href: '/teams' }, { label: 'Error' }]}>
        <div className="text-center py-12">
          <p className="text-neutral-text-muted">No se pudo cargar el equipo</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/teams')}>
            Volver a equipos
          </Button>
        </div>
      </AppLayout>
    )
  }

  const isMember = team.members.some((m) => m.nickname === user?.nickname)

  return (
    <AppLayout breadcrumbs={[{ label: 'Equipos', href: '/teams' }, { label: team.name }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <UsersRound className="h-6 w-6 text-brand-primary" />
              <h1 className="text-2xl font-bold text-neutral-text-primary">{team.name}</h1>
            </div>
            <p className="text-sm text-neutral-text-muted mt-1">
              Creado por <span className="font-medium">{team.createdBy.nickname}</span> el{' '}
              {new Date(team.createdAt).toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {isMember && (
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invitar
              </Button>
              <Button variant="danger" onClick={() => setShowLeaveDialog(true)}>
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          )}
        </div>

        {/* Members */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-text-primary flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            Miembros
            <Badge variant="default">{team.members.length}</Badge>
          </h2>
          <div className="rounded-lg border border-neutral-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nickname</TableHead>
                  <TableHead>Miembro desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <span className="font-medium text-neutral-text-primary">
                        {member.nickname}
                        {member.nickname === user?.nickname && (
                          <Badge variant="primary" className="ml-2">Tú</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-neutral-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(member.joinedAt).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pending Invitations */}
        {team.pendingInvitations.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-text-primary flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invitaciones pendientes
              <Badge variant="warning">{team.pendingInvitations.length}</Badge>
            </h2>
            <div className="rounded-lg border border-neutral-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invitado</TableHead>
                    <TableHead>Invitado por</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.pendingInvitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invitee.nickname}</TableCell>
                      <TableCell className="text-neutral-text-muted">{inv.invitedBy.nickname}</TableCell>
                      <TableCell className="text-neutral-text-muted">
                        {new Date(inv.invitedAt).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar miembro</DialogTitle>
            <DialogDescription>
              Ingresa el nickname del usuario que deseas invitar al equipo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleInvite)}>
            <div className="py-4">
              <label className="text-sm font-medium mb-1 block">Nickname</label>
              <SearchSelect
                query={nicknameQuery}
                onQueryChange={(v) => form.setValue('nickname', v, { shouldValidate: true })}
                results={(searchData?.users ?? []).filter(
                  (u) => !team.members.some((m) => m.nickname === u.nickname),
                )}
                isSearching={isSearchingUsers}
                placeholder="Buscar usuario por nombre o nickname..."
                emptyLabel="Sin resultados (o ya es miembro)"
                hintLabel="Escribe al menos 2 caracteres"
                getKey={(u) => u.id}
                renderItem={(u) => (
                  <div>
                    <p className="font-medium text-neutral-text-primary">{u.name}</p>
                    <p className="text-xs text-neutral-text-muted">@{u.nickname}</p>
                  </div>
                )}
                onSelect={(u) => form.setValue('nickname', u.nickname, { shouldValidate: true })}
              />
              {form.formState.errors.nickname?.message && (
                <p className="text-sm text-status-error mt-1">{form.formState.errors.nickname.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => { setShowInviteDialog(false); form.reset() }}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" isLoading={inviteMember.isPending}>
                Enviar invitación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salir del equipo</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas salir de "{team.name}"? Si estás seleccionado para una competencia programada, serás removido de su alineación.
            </DialogDescription>
          </DialogHeader>
          {isCheckingLeave && (
            <p className="text-sm text-neutral-text-muted">Comprobando si tu salida afecta las inscripciones del equipo…</p>
          )}
          {leaveImpactFailed && (
            <p className="text-sm text-neutral-text-muted">
              No pudimos comprobar si tu salida afecta las inscripciones del equipo en competencias programadas.
            </p>
          )}
          {registrationsToCancel.length > 0 && (
            <div className="rounded-md border border-status-warning/40 bg-status-warning/10 p-3 text-sm text-neutral-text-primary space-y-2">
              <p>
                Si sales, el equipo se quedaría con menos integrantes de los que piden estas competencias, y su inscripción se cancelará:
              </p>
              <ul className="list-disc list-inside">
                {registrationsToCancel.map((r) => (
                  <li key={r.contestId}>
                    <Link className="underline underline-offset-2" to={PATHS.contest(r.groupId, r.contestId)}>
                      {r.contestName}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleLeave} isLoading={leaveTeam.isPending}>
              Salir del equipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
