import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { EntityDetailPage } from '@/components/patterns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/features/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
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
  useMyJoinRequest,
  useInvitations,
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
import { useSearchUsers } from '@/hooks/api/useUsers'
import { MaterialListItem } from '@/components/features/MaterialListItem'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { useToastContext } from '@/hooks/useToastContext'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { ROUTES, PATHS } from '@/lib/constants'
import { formatDuration } from '@/lib/utils'
import { ApiClientError } from '@/lib/errors'
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
  FileText,
  Copy,
  Calendar,
} from 'lucide-react'

// Deterministic color from name initial
const INITIAL_COLORS = [
  'bg-rose-50 text-rose-700',
  'bg-amber-50 text-amber-700',
  'bg-emerald-50 text-emerald-700',
  'bg-indigo-50 text-indigo-700',
  'bg-violet-50 text-violet-700',
  'bg-cyan-50 text-cyan-700',
  'bg-orange-50 text-orange-700',
] as const

function getInitialColor(name: string) {
  const code = name.charCodeAt(0) || 0
  return INITIAL_COLORS[code % INITIAL_COLORS.length]
}

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
  const { data: myJoinRequest } = useMyJoinRequest(id!, {
    enabled: !isMember && group?.joinPolicy === 'REQUEST' && !group?.userMembership.hasPendingRequest,
  })
  const { data: invitationsData } = useInvitations(id!)
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
  const [inviteMethod, setInviteMethod] = useState<'nickname' | 'email'>('nickname')
  const [inviteNickname, setInviteNickname] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')

  // GET /users/search is Coach/Admin-only. canManage below is domain-scoped (group lead or
  // platform Admin) and doesn't guarantee platform role Coach, so gate the search itself
  // separately — otherwise a lead who isn't a Coach would trigger a 403 from the backend.
  const canSearchUsers = user?.role === 'ADMIN' || user?.role === 'COACH'
  const debouncedAddNickname = useDebounce(addNickname)
  const { data: addMemberSearchData, isFetching: isSearchingAddMember } = useSearchUsers(debouncedAddNickname, undefined, canSearchUsers)
  const debouncedInviteNickname = useDebounce(inviteNickname)
  const { data: inviteSearchData, isFetching: isSearchingInvite } = useSearchUsers(debouncedInviteNickname, undefined, canSearchUsers)

  if (!id) return null

  const handleJoinOpen = async () => {
    try {
      await joinMutation.mutateAsync(id)
      toast({ variant: 'success', title: 'Te has unido al grupo' })
    } catch {
      toast({ variant: 'error', title: 'Error al unirse al grupo' })
    }
  }

  const handleSubmitRequest = async () => {
    try {
      await requestMutation.mutateAsync({ groupId: id, data: requestMessage.trim() ? { message: requestMessage.trim() } : undefined })
      toast({ variant: 'success', title: 'Solicitud enviada' })
      setRequestOpen(false)
      setRequestMessage('')
    } catch {
      toast({ variant: 'error', title: 'Error al enviar la solicitud' })
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
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'CANNOT_LEAVE_AS_LAST_LEAD') {
        toast({ variant: 'error', title: 'No puedes salir: eres el único líder del grupo', description: 'Asigna otro líder primero.' })
      } else {
        toast({ variant: 'error', title: 'Error al salir del grupo' })
      }
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
    const data = inviteMethod === 'nickname'
      ? { inviteeNickname: inviteNickname.trim() }
      : { inviteeEmail: inviteEmail.trim() }
    if (inviteMethod === 'nickname' ? !inviteNickname.trim() : !inviteEmail.trim()) return
    try {
      const response = await inviteMutation.mutateAsync({ groupId: id, data })
      toast({ variant: 'success', title: 'Invitación enviada' })
      // The backend never returns a ready-made link — only `id` — so the frontend builds it,
      // matching the same route the invitation email itself points to.
      setGeneratedInviteUrl(`${window.location.origin}${PATHS.groupAcceptInvitation(id, response.id)}`)
      setInviteNickname('')
      setInviteEmail('')
    } catch {
      toast({ variant: 'error', title: 'Error al enviar invitación' })
    }
  }

  const handleCopyInviteUrl = async () => {
    if (!generatedInviteUrl) return
    await navigator.clipboard.writeText(generatedInviteUrl)
    toast({ variant: 'success', title: 'Enlace copiado' })
  }

  const closeInviteDialog = () => {
    setInviteOpen(false)
    setGeneratedInviteUrl(null)
    setInviteMethod('nickname')
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
      return { label: 'Unirse', onClick: handleJoinOpen, icon: UserPlus, variant: 'primary' as const }
    }
    if (group.joinPolicy === 'REQUEST') {
      return { label: 'Solicitar Ingreso', onClick: () => setRequestOpen(true), icon: UserPlus, variant: 'primary' as const }
    }
    return undefined
  }

  const buildAdditionalActions = () => {
    const actions: Array<{ label: string; onClick: () => void; icon?: React.ElementType; variant?: 'default' | 'danger' }> = []
    if (isMember && !group?.isGlobal) {
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

  const invitationsTab = canManage ? (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invitado</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Expira</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitationsData?.invitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{inv.invitee.fullName}</p>
                    <p className="text-xs text-neutral-text-muted">@{inv.invitee.nickname}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-neutral-text-muted">{inv.invitee.email}</TableCell>
                <TableCell className="text-sm text-neutral-text-muted">{new Date(inv.expiresAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {(!invitationsData || invitationsData.invitations.length === 0) && (
              <TableRow><TableCell colSpan={3} className="text-center text-neutral-text-muted py-8">No hay invitaciones pendientes</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  ) : null

  const infoTab = group ? (
    <div className="space-y-4">
      {/* Description */}
      <Card>
        <CardHeader><CardTitle>Descripción</CardTitle></CardHeader>
        <CardContent>
          <p className="text-neutral-text-muted">{group.description || 'Sin descripción'}</p>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard align="center" value={group.statistics.memberCount} label="Miembros" />
        <StatCard
          align="center"
          value={group.statistics.activeContestCount}
          label="Contests activos"
          valueColor="text-status-success"
        />
        <StatCard align="center" value={group.statistics.contestCount} label="Contests totales" />
        <StatCard align="center" value={group.statistics.materialCount} label="Materiales" />
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-neutral-text-muted">
              <Calendar className="h-4 w-4" />
              <span>Creado: <span className="font-medium text-neutral-text-primary">{new Date(group.createdAt).toLocaleDateString('es')}</span></span>
            </div>
            <div className="flex items-center gap-2 text-neutral-text-muted">
              <Clock className="h-4 w-4" />
              <span>Programados: <span className="font-medium text-neutral-text-primary">{group.statistics.scheduledContestCount}</span></span>
            </div>
            <div className="flex items-center gap-2 text-neutral-text-muted">
              <Trophy className="h-4 w-4" />
              <span>Finalizados: <span className="font-medium text-neutral-text-primary">{group.statistics.finishedContestCount}</span></span>
            </div>
            <div className="flex items-center gap-2 text-neutral-text-muted">
              <FileText className="h-4 w-4" />
              <span>Materiales: <span className="font-medium text-neutral-text-primary">{group.statistics.materialCount}</span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaders with initial avatars */}
      {group.leads.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Líderes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {group.leads.map((l) => (
                <div
                  key={l.userId}
                  className="flex items-center gap-3 cursor-pointer hover:bg-neutral-bg/50 rounded-lg p-2 -mx-2 transition-colors"
                  onClick={() => navigate(`/users/${l.nickname}`)}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-md flex items-center justify-center font-bold text-sm shrink-0',
                    getInitialColor(l.name)
                  )}>
                    {l.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-neutral-text-primary">{l.name}</p>
                    <p className="text-xs text-neutral-text-muted">@{l.nickname}</p>
                  </div>
                  <Badge variant="warning" className="ml-auto text-[10px]">Líder</Badge>
                </div>
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
          <Button size="sm" onClick={() => navigate(PATHS.contestNew(id))}>
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
              onClick={() => navigate(PATHS.contest(id, c.id))}
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
            <Button size="sm" className="mt-3" onClick={() => navigate(PATHS.contestNew(id))}>
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
    ...(canManage ? [{ id: 'invitations', label: 'Invitaciones', content: invitationsTab, badge: invitationsData?.invitations.length }] : []),
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
        onEdit={canManage && !group?.isGlobal ? () => navigate(`/groups/${id}/edit`) : undefined}
        onDelete={canManage && !group?.isGlobal ? () => setDeleteOpen(true) : undefined}
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
            <div>
              <label className="text-sm font-medium mb-1 block">Usuario</label>
              <SearchSelect
                query={addNickname}
                onQueryChange={setAddNickname}
                results={(addMemberSearchData?.users ?? []).filter(
                  (u) => !membersData?.members.some((m) => m.nickname === u.nickname),
                )}
                isSearching={isSearchingAddMember}
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
                onSelect={(u) => setAddNickname(u.nickname)}
              />
            </div>
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
      <Dialog open={inviteOpen} onOpenChange={(open) => (open ? setInviteOpen(true) : closeInviteDialog())}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invitar usuario</DialogTitle></DialogHeader>
          {generatedInviteUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-text-muted">
                Invitación generada. Comparte este enlace con la persona invitada (también se le envía automáticamente):
              </p>
              <div className="flex items-center gap-2">
                <Input value={generatedInviteUrl} readOnly className="flex-1" />
                <Button variant="outline" size="sm" onClick={handleCopyInviteUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-1">
                <Button
                  variant={inviteMethod === 'nickname' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setInviteMethod('nickname')}
                >
                  Por nickname
                </Button>
                <Button
                  variant={inviteMethod === 'email' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setInviteMethod('email')}
                >
                  Por correo
                </Button>
              </div>
              {inviteMethod === 'nickname' ? (
                <div>
                  <label className="text-sm font-medium mb-1 block">Usuario</label>
                  <SearchSelect
                    query={inviteNickname}
                    onQueryChange={setInviteNickname}
                    results={inviteSearchData?.users ?? []}
                    isSearching={isSearchingInvite}
                    placeholder="Buscar usuario por nombre o nickname..."
                    hintLabel="Escribe al menos 2 caracteres"
                    getKey={(u) => u.id}
                    renderItem={(u) => (
                      <div>
                        <p className="font-medium text-neutral-text-primary">{u.name}</p>
                        <p className="text-xs text-neutral-text-muted">@{u.nickname}</p>
                      </div>
                    )}
                    onSelect={(u) => setInviteNickname(u.nickname)}
                  />
                </div>
              ) : (
                <Input label="Correo electrónico" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="correo@ejemplo.com" />
              )}
            </>
          )}
          <DialogFooter>
            {generatedInviteUrl ? (
              <Button onClick={closeInviteDialog}>Cerrar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeInviteDialog}>Cancelar</Button>
                <Button
                  onClick={handleInvite}
                  isLoading={inviteMutation.isPending}
                  disabled={inviteMethod === 'nickname' ? !inviteNickname.trim() : !inviteEmail.trim()}
                >
                  Enviar invitación
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join request dialog (REQUEST policy) */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar ingreso</DialogTitle>
            <DialogDescription>Puedes agregar un mensaje opcional para los líderes del grupo.</DialogDescription>
          </DialogHeader>
          {myJoinRequest?.status === 'REJECTED' && (
            <div className="bg-status-warning/10 border border-status-warning/30 rounded-md p-3 text-sm text-status-warning">
              Tu solicitud anterior a este grupo fue rechazada
              {myJoinRequest.createdAt && ` el ${new Date(myJoinRequest.createdAt).toLocaleDateString('es')}`}.
              Puedes intentarlo de nuevo.
            </div>
          )}
          <Textarea
            label="Mensaje (opcional)"
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            placeholder="Cuéntales por qué quieres unirte..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitRequest} isLoading={requestMutation.isPending}>Enviar solicitud</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
