import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UsersRound, UserPlus, LogOut, Clock, Mail } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Badge, Input } from '@/components/ui'
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
import { useTeamDetail, useInviteTeamMember, useLeaveTeam } from '@/hooks/api/useTeams'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/components/ui/ToastProvider'
import { inviteTeamMemberSchema, type InviteTeamMemberFormData } from '@/lib/schemas/team'
import { ApiClientError } from '@/api/client'

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

  const form = useForm<InviteTeamMemberFormData>({
    resolver: zodResolver(inviteTeamMemberSchema),
    defaultValues: { nickname: '' },
  })

  const handleInvite = async (data: InviteTeamMemberFormData) => {
    if (!teamId) return
    try {
      await inviteMember.mutateAsync({ teamId, data })
      toast({ variant: 'success', title: 'Invitación enviada', description: `Se invitó a ${data.nickname}` })
      setShowInviteDialog(false)
      form.reset()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({ variant: 'error', title: 'Error', description: err.message })
      }
    }
  }

  const handleLeave = async () => {
    if (!teamId) return
    try {
      await leaveTeam.mutateAsync(teamId)
      toast({ variant: 'success', title: 'Has salido del equipo' })
      navigate('/teams')
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({ variant: 'error', title: 'Error', description: err.message })
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
              <Input
                label="Nickname"
                placeholder="Ej: john_doe"
                error={form.formState.errors.nickname?.message}
                {...form.register('nickname')}
              />
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
              ¿Estás seguro de que deseas salir de "{team.name}"? Si estás seleccionado para un contest programado, serás removido automáticamente.
            </DialogDescription>
          </DialogHeader>
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
