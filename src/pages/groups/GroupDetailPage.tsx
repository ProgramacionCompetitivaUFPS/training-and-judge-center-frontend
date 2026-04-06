import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { EntityDetailPage } from '@/components/patterns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/Select'
import {
  useGroupDetail,
  useGroupMembers,
  useJoinRequests,
  useJoinGroup,
  useCreateJoinRequest,
  useCancelJoinRequest,
  useLeaveGroup,
  useDeleteGroup,
  useProcessJoinRequest,
  useRemoveMember,
  useChangeMemberRole,
  useAddMember,
  useCreateInvitation,
} from '@/hooks/api/useGroups'
import { useMaterials } from '@/hooks/api/useMaterials'
import { useContests } from '@/hooks/api/useContests'
import { MaterialListItem } from '@/components/features/MaterialListItem'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { useToastContext } from '@/components/layout/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import { formatDuration } from '@/lib/utils'
import type { GroupRole } from '@/types/group'
import {
  Shield,
  BookOpen,
  LogOut,
  UserPlus,
  UserMinus,
  Check,
  X,
  Trophy,
  Clock,
  Users,
} from 'lucide-react'

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToastContext()
  const { user } = useAuth()

  const { data: group, isLoading } = useGroupDetail(id!)
  const { data: membersData } = useGroupMembers(id!)
  const isLead = group?.userMembership.role === 'LEAD'
  const canManage = isLead || user?.role === 'ADMIN'
  const isMember = group?.userMembership.isMember ?? false
  const { data: requestsData } = useJoinRequests(id!, { status: 'PENDING' })
  const { data: materialsData } = useMaterials(id!, { limit: 5 })
  const { data: contestsData } = useContests(id!, { limit: 10, sortBy: 'startTime', sortOrder: 'desc' })

  const joinMutation = useJoinGroup()
  const requestMutation = useCreateJoinRequest()
  const cancelRequestMutation = useCancelJoinRequest()
  const leaveMutation = useLeaveGroup()
  const deleteMutation = useDeleteGroup()
  const processRequestMutation = useProcessJoinRequest()
  const removeMemberMutation = useRemoveMember()
  const changeRoleMutation = useChangeMemberRole()
  const addMemberMutation = useAddMember()
  const inviteMutation = useCreateInvitation()

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [addNickname, setAddNickname] = useState('')
  const [addRole, setAddRole] = useState<GroupRole>('MEMBER')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteNickname, setInviteNickname] = useState('')

  if (!id) return null

  const handleJoin = async () => {
    if (!group) return
    try {
      if (group.joinPolicy === 'OPEN') {
        await joinMutation.mutateAsync(id)
        toast({ variant: 'success', title: 'Te has unido al grupo' })
      } else if (group.joinPolicy === 'REQUEST') {
        await requestMutation.mutateAsync({ groupId: id })
        toast({ variant: 'success', title: 'Solicitud enviada' })
      }
    } catch {
      toast({ variant: 'error', title: 'Error al unirse al grupo' })
    }
  }

  const handleCancelRequest = async () => {
    try {
      await cancelRequestMutation.mutateAsync(id)
      toast({ variant: 'success', title: 'Solicitud cancelada' })
    } catch {
      toast({ variant: 'error', title: 'Error al cancelar solicitud' })
    }
  }

  const handleLeave = async () => {
    if (!confirm('¿Seguro que deseas salir del grupo?')) return
    try {
      await leaveMutation.mutateAsync(id)
      toast({ variant: 'success', title: 'Has salido del grupo' })
      navigate(ROUTES.GROUPS)
    } catch {
      toast({ variant: 'error', title: 'Error al salir del grupo' })
    }
  }

  const handleDelete = async () => {
    if (!group || deleteConfirm !== group.name) return
    try {
      await deleteMutation.mutateAsync({ id, data: { confirmationName: deleteConfirm } })
      toast({ variant: 'success', title: 'Grupo eliminado' })
      navigate(ROUTES.GROUPS)
    } catch {
      toast({ variant: 'error', title: 'Error al eliminar grupo' })
    }
    setDeleteOpen(false)
    setDeleteConfirm('')
  }

  const handleProcessRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await processRequestMutation.mutateAsync({ groupId: id, requestId, data: { status } })
      toast({ variant: 'success', title: status === 'APPROVED' ? 'Solicitud aprobada' : 'Solicitud rechazada' })
    } catch {
      toast({ variant: 'error', title: 'Error al procesar solicitud' })
    }
  }

  const handleRemoveMember = async (nickname: string) => {
    if (!confirm(`¿Eliminar a @${nickname} del grupo?`)) return
    try {
      await removeMemberMutation.mutateAsync({ groupId: id, nickname })
      toast({ variant: 'success', title: 'Miembro eliminado' })
    } catch {
      toast({ variant: 'error', title: 'Error al eliminar miembro' })
    }
  }

  const handleChangeRole = async (nickname: string, role: GroupRole) => {
    try {
      await changeRoleMutation.mutateAsync({ groupId: id, nickname, data: { role } })
      toast({ variant: 'success', title: 'Rol actualizado' })
    } catch {
      toast({ variant: 'error', title: 'Error al cambiar rol' })
    }
  }

  const handleAddMember = async () => {
    if (!addNickname.trim()) return
    try {
      await addMemberMutation.mutateAsync({ groupId: id, data: { nickname: addNickname.trim(), role: addRole } })
      toast({ variant: 'success', title: 'Miembro agregado' })
      setAddMemberOpen(false)
      setAddNickname('')
    } catch {
      toast({ variant: 'error', title: 'Error al agregar miembro' })
    }
  }

  const handleInvite = async () => {
    if (!inviteNickname.trim()) return
    try {
      await inviteMutation.mutateAsync({ groupId: id, data: { inviteeNickname: inviteNickname.trim() } })
      toast({ variant: 'success', title: 'Invitación enviada' })
      setInviteOpen(false)
      setInviteNickname('')
    } catch {
      toast({ variant: 'error', title: 'Error al enviar invitación' })
    }
  }

  // Build primary action based on membership state
  const buildPrimaryAction = () => {
    if (!group) return undefined
    if (isMember) return undefined
    if (group.userMembership.hasPendingInvitation) {
      return { label: 'Invitación Pendiente', onClick: () => {}, variant: 'outline' as const }
    }
    if (group.userMembership.hasPendingRequest) {
      return { label: 'Cancelar Solicitud', onClick: handleCancelRequest, variant: 'outline' as const }
    }
    if (group.joinPolicy === 'OPEN') {
      return { label: 'Unirse', onClick: handleJoin, icon: UserPlus, variant: 'primary' as const }
    }
    if (group.joinPolicy === 'REQUEST') {
      return { label: 'Solicitar Ingreso', onClick: handleJoin, icon: UserPlus, variant: 'primary' as const }
    }
    return undefined
  }

  const buildAdditionalActions = () => {
    const actions: Array<{ label: string; onClick: () => void; icon?: React.ElementType; variant?: 'default' | 'danger' }> = []
    if (isMember && !canManage) {
      actions.push({ label: 'Salir del grupo', onClick: handleLeave, icon: LogOut, variant: 'danger' })
    }
    if (canManage) {
      actions.push({ label: 'Agregar miembro', onClick: () => setAddMemberOpen(true), icon: UserPlus })
      if (group?.joinPolicy === 'INVITE') {
        actions.push({ label: 'Invitar usuario', onClick: () => setInviteOpen(true), icon: UserPlus })
      }
    }
    return actions.length > 0 ? actions : undefined
  }

  const policyLabels: Record<string, string> = { OPEN: 'Abierto', REQUEST: 'Solicitud', INVITE: 'Invitación' }

  const metadata: never[] = []

  const badges = group ? [
    { label: group.visibility === 'VISIBLE' ? 'Visible' : 'No visible', variant: group.visibility === 'VISIBLE' ? 'primary' as const : 'default' as const },
    { label: policyLabels[group.joinPolicy], variant: 'default' as const },
    ...(group.isGlobal ? [{ label: 'Global', variant: 'warning' as const }] : []),
  ] : []

  // Tabs content
  const membersTab = (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Desde</TableHead>
              {canManage && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {membersData?.members.map((m) => (
              <TableRow key={m.userId}>
                <TableCell>
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-neutral-text-muted">@{m.nickname}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={m.role === 'LEAD' ? 'warning' : 'outline'}>{m.role === 'LEAD' ? 'Líder' : 'Miembro'}</Badge>
                </TableCell>
                <TableCell className="text-sm text-neutral-text-muted">{new Date(m.joinedAt).toLocaleDateString()}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleChangeRole(m.nickname, m.role === 'LEAD' ? 'MEMBER' : 'LEAD')} title={m.role === 'LEAD' ? 'Hacer miembro' : 'Hacer líder'}>
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(m.nickname)} title="Eliminar">
                        <UserMinus className="h-4 w-4 text-status-error" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(!membersData || membersData.members.length === 0) && (
              <TableRow><TableCell colSpan={canManage ? 4 : 3} className="text-center text-neutral-text-muted py-8">No hay miembros</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )

  const requestsTab = canManage ? (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Solicitante</TableHead>
              <TableHead>Mensaje</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requestsData?.requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{r.requester.name}</p>
                    <p className="text-xs text-neutral-text-muted">@{r.requester.nickname}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-neutral-text-muted">{r.message || '—'}</TableCell>
                <TableCell className="text-sm text-neutral-text-muted">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleProcessRequest(r.id, 'APPROVED')} title="Aprobar">
                      <Check className="h-4 w-4 text-status-success" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleProcessRequest(r.id, 'REJECTED')} title="Rechazar">
                      <X className="h-4 w-4 text-status-error" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!requestsData || requestsData.requests.length === 0) && (
              <TableRow><TableCell colSpan={4} className="text-center text-neutral-text-muted py-8">No hay solicitudes pendientes</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  ) : null

  const infoTab = group ? (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Información</CardTitle></CardHeader>
        <CardContent>
          <p className="text-neutral-text-muted">{group.description || 'Sin descripción'}</p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-text-muted">Creado:</span>{' '}
              <span className="font-medium">{new Date(group.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-neutral-text-muted">Contests activos:</span>{' '}
              <span className="font-medium">{group.statistics.activeContestCount}</span>
            </div>
            <div>
              <span className="text-neutral-text-muted">Contests programados:</span>{' '}
              <span className="font-medium">{group.statistics.scheduledContestCount}</span>
            </div>
            <div>
              <span className="text-neutral-text-muted">Contests finalizados:</span>{' '}
              <span className="font-medium">{group.statistics.finishedContestCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      {group.leads.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Líderes</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {group.leads.map((l) => (
                <Badge key={l.userId} variant="outline" className="cursor-pointer" onClick={() => navigate(`/users/${l.nickname}`)}>
                  <Shield className="h-3 w-3 mr-1" />{l.name} (@{l.nickname})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  ) : null

  const materialsTab = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-text-muted">
          Últimos materiales publicados en este grupo
        </p>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button size="sm" onClick={() => navigate(`/groups/${id}/materials/new`)}>
              Nuevo material
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/groups/${id}/materials`)}>
            Ver todos
          </Button>
        </div>
      </div>
      {materialsData?.materials && materialsData.materials.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-neutral-border">
              {materialsData.materials.map((m) => (
                <MaterialListItem
                  key={m.id}
                  material={m}
                  onClick={() => navigate(`/groups/${id}/materials/${m.id}`)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="py-8 text-center text-neutral-text-muted">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay materiales en este grupo</p>
          {canManage && (
            <Button size="sm" className="mt-3" onClick={() => navigate(`/groups/${id}/materials/new`)}>
              Crear primer material
            </Button>
          )}
        </div>
      )}
    </div>
  )

  const contestsTab = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-text-muted">
          Competencias de este grupo
        </p>
        {canManage && (
          <Button size="sm" onClick={() => navigate(`/groups/${id}/contests/new`)}>
            Nueva competencia
          </Button>
        )}
      </div>
      {contestsData?.data && contestsData.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contestsData.data.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-brand-primary/40 transition-colors"
              onClick={() => navigate(`/contests/${c.id}`)}
            >
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <ContestStatusBadge status={c.status} />
                  <span className="text-xs text-neutral-text-muted">{formatDuration(c.duration)}</span>
                </div>
                <h3 className="font-semibold text-neutral-text-primary leading-tight">{c.name}</h3>
                <div className="flex items-center gap-4 text-xs text-neutral-text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(c.startTime).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {c.participantCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5" />
                    {c.problemCount} problemas
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-neutral-text-muted">
          <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay competencias en este grupo</p>
          {canManage && (
            <Button size="sm" className="mt-3" onClick={() => navigate(`/groups/${id}/contests/new`)}>
              Crear primera competencia
            </Button>
          )}
        </div>
      )}
    </div>
  )

  const tabs = [
    { id: 'info', label: 'Información', content: infoTab },
    { id: 'contests', label: 'Competencias', content: contestsTab, badge: contestsData?.data?.length },
    { id: 'members', label: 'Miembros', content: membersTab, badge: group?.statistics.memberCount },
    { id: 'materials', label: 'Materiales', content: materialsTab, badge: group?.statistics.materialCount },
    ...(canManage ? [{ id: 'requests', label: 'Solicitudes', content: requestsTab, badge: requestsData?.requests.length }] : []),
  ]

  return (
    <>
      <EntityDetailPage
        title={group?.name ?? ''}
        subtitle={group?.description ?? undefined}
        badges={badges}
        breadcrumbs={[{ label: 'Grupos', href: ROUTES.GROUPS }, { label: group?.name ?? 'Cargando...' }]}
        isLoading={isLoading}
        metadata={metadata}
        tabs={tabs}
        defaultTab="info"
        onEdit={canManage ? () => navigate(`/groups/${id}/edit`) : undefined}
        onDelete={canManage ? () => setDeleteOpen(true) : undefined}
        primaryAction={buildPrimaryAction()}
        additionalActions={buildAdditionalActions()}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar grupo</DialogTitle>
            <DialogDescription>
              Escribe <span className="font-bold">{group?.name}</span> para confirmar la eliminación. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="Nombre del grupo" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteConfirm !== group?.name}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add member dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar miembro</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input label="Nickname" value={addNickname} onChange={(e) => setAddNickname(e.target.value)} placeholder="nickname del usuario" />
            <div>
              <label className="text-sm font-medium mb-1 block">Rol</label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as GroupRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Miembro</SelectItem>
                  <SelectItem value="LEAD">Líder</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddMember} disabled={!addNickname.trim()}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invitar usuario</DialogTitle></DialogHeader>
          <Input label="Nickname" value={inviteNickname} onChange={(e) => setInviteNickname(e.target.value)} placeholder="nickname del usuario" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={!inviteNickname.trim()}>Enviar invitación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
