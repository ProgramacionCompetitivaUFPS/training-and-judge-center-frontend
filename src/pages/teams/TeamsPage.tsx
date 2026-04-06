import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UsersRound, Plus, Mail, Check, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppLayout } from '@/components/layout'
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { EmptyState } from '@/components/patterns'
import { useMyTeams, useMyTeamInvitations, useCreateTeam, useAcceptTeamInvitation, useRejectTeamInvitation } from '@/hooks/api/useTeams'
import { useToastContext } from '@/components/layout/ToastProvider'
import { createTeamSchema, type CreateTeamFormData } from '@/lib/schemas/team'
import { ApiClientError } from '@/lib/errors'
import { Skeleton } from '@/components/ui/Skeleton'

export function TeamsPage() {
  const navigate = useNavigate()
  const { toast } = useToastContext()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { data: teamsData, isLoading: teamsLoading } = useMyTeams()
  const { data: invitationsData, isLoading: invitationsLoading } = useMyTeamInvitations()

  const createTeam = useCreateTeam()
  const acceptInvitation = useAcceptTeamInvitation()
  const rejectInvitation = useRejectTeamInvitation()

  const form = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: '' },
  })

  const handleCreate = async (data: CreateTeamFormData) => {
    try {
      const result = await createTeam.mutateAsync(data)
      toast({ variant: 'success', title: 'Equipo creado', description: `"${result.name}" fue creado exitosamente` })
      setShowCreateDialog(false)
      form.reset()
      navigate(`/teams/${result.id}`)
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({ variant: 'error', title: 'Error', description: err.message })
      }
    }
  }

  const handleAccept = async (invitationId: string) => {
    try {
      await acceptInvitation.mutateAsync(invitationId)
      toast({ variant: 'success', title: 'Invitación aceptada', description: 'Te has unido al equipo' })
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({ variant: 'error', title: 'Error', description: err.message })
      }
    }
  }

  const handleReject = async (invitationId: string) => {
    try {
      await rejectInvitation.mutateAsync(invitationId)
      toast({ variant: 'success', title: 'Invitación rechazada' })
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({ variant: 'error', title: 'Error', description: err.message })
      }
    }
  }

  const teams = teamsData?.teams ?? []
  const invitations = invitationsData?.invitations ?? []

  return (
    <AppLayout breadcrumbs={[{ label: 'Equipos' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-text-primary">Mis Equipos</h1>
            <p className="text-sm text-neutral-text-muted mt-1">Gestiona tus equipos y responde invitaciones</p>
          </div>
          <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear equipo
          </Button>
        </div>

        {/* Pending Invitations */}
        {invitationsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : invitations.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-text-primary flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invitaciones pendientes
              <Badge variant="primary">{invitations.length}</Badge>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {invitations.map((inv) => (
                <Card key={inv.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-neutral-text-primary">{inv.team.name}</p>
                        <p className="text-sm text-neutral-text-muted">
                          Invitado por <span className="font-medium">{inv.invitedBy.nickname}</span>
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAccept(inv.id)}
                          isLoading={acceptInvitation.isPending}
                        >
                          <Check className="h-4 w-4 text-status-success" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(inv.id)}
                          isLoading={rejectInvitation.isPending}
                        >
                          <X className="h-4 w-4 text-status-error" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {/* Teams List */}
        {teamsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No tienes equipos"
            description="Crea un equipo para competir con otros usuarios o espera una invitación"
            action={{ label: 'Crear equipo', onClick: () => setShowCreateDialog(true), icon: Plus }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card
                key={team.id}
                className="cursor-pointer hover:border-brand-primary transition-colors"
                onClick={() => navigate(`/teams/${team.id}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{team.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-neutral-text-muted">
                    <span className="flex items-center gap-1">
                      <UsersRound className="h-4 w-4" />
                      {team.memberCount} {team.memberCount === 1 ? 'miembro' : 'miembros'}
                    </span>
                    <span>
                      Unido {new Date(team.joinedAt).toLocaleDateString('es')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear equipo</DialogTitle>
            <DialogDescription>
              Elige un nombre para tu nuevo equipo. Serás agregado automáticamente como miembro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)}>
            <div className="py-4">
              <Input
                label="Nombre del equipo"
                placeholder="Ej: Competitive Coders"
                error={form.formState.errors.name?.message}
                {...form.register('name')}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => { setShowCreateDialog(false); form.reset() }}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" isLoading={createTeam.isPending}>
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
