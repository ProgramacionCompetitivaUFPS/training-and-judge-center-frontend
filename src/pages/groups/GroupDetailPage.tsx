import { useState, type ReactNode } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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
import { PaginationControls, PaginationSummary } from '@/components/ui/Pagination'
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
import { RowLink } from '@/components/ui/RowLink'
import { GroupDeletionDialog } from '@/components/features/GroupDeletionDialog'
import { useToastContext } from '@/hooks/useToastContext'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { cn, pluralize } from '@/lib/utils'
import { ROUTES, PATHS } from '@/lib/constants'
import { formatDuration } from '@/lib/utils'
import { ApiClientError, isNotFoundError } from '@/lib/errors'
import { ErrorPage } from '@/pages/errors/ErrorPage'
import type { GroupRole, JoinRequestStatus } from '@/types/group'
import type { ContestStatus } from '@/types/contest'
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
  Copy,
  Calendar,
} from 'lucide-react'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import { getErrorMessage } from '@/lib/errorMessages'

type GroupData = NonNullable<ReturnType<typeof useGroupDetail>['data']>
type MembersData = NonNullable<ReturnType<typeof useGroupMembers>['data']>
type RequestsData = NonNullable<ReturnType<typeof useJoinRequests>['data']>
type InvitationsData = NonNullable<ReturnType<typeof useInvitations>['data']>
type MaterialsData = NonNullable<ReturnType<typeof useMaterials>['data']>
type ContestsData = NonNullable<ReturnType<typeof useContests>['data']>
type MyJoinRequest = ReturnType<typeof useMyJoinRequest>['data']
type PageQuery = { page: number; limit: number }

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

const POLICY_LABELS: Record<string, string> = { OPEN: 'Abierto', REQUEST: 'Solicitud', INVITE: 'Invitación' }

const REQUEST_STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
]

const CONTEST_STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'SCHEDULED', label: 'Programadas' },
  { value: 'ACTIVE', label: 'En curso' },
  { value: 'FINISHED', label: 'Finalizadas' },
]

const REQUEST_BADGE: Record<JoinRequestStatus, { variant: 'warning' | 'success' | 'error'; label: string }> = {
  PENDING: { variant: 'warning', label: 'Pendiente' },
  APPROVED: { variant: 'success', label: 'Aprobada' },
  REJECTED: { variant: 'error', label: 'Rechazada' },
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('es')

// ───────────────────────────── header: badges and actions ─────────────────────────────

function buildBadges(group: GroupData | undefined) {
  if (!group) return []
  return [
    { label: group.visibility === 'VISIBLE' ? 'Visible' : 'No visible', variant: group.visibility === 'VISIBLE' ? 'primary' as const : 'default' as const },
    { label: POLICY_LABELS[group.joinPolicy], variant: 'default' as const },
    ...(group.isGlobal ? [{ label: 'Global', variant: 'warning' as const }] : []),
  ]
}

interface PrimaryActionDeps {
  group: GroupData | undefined
  isMember: boolean
  myJoinRequest: MyJoinRequest
  onCancelRequest: () => void
  onJoin: () => void
  onRequest: () => void
}

/** The main button of the header, by membership state. */
function buildPrimaryAction({ group, isMember, myJoinRequest, onCancelRequest, onJoin, onRequest }: PrimaryActionDeps) {
  if (!group || isMember) return undefined
  if (myJoinRequest?.request?.status === 'PENDING') {
    return { label: 'Cancelar Solicitud', onClick: onCancelRequest, variant: 'outline' as const }
  }
  if (group.joinPolicy === 'OPEN') {
    return { label: 'Unirse', onClick: onJoin, icon: UserPlus, variant: 'primary' as const }
  }
  if (group.joinPolicy === 'REQUEST') {
    return { label: 'Solicitar Ingreso', onClick: onRequest, icon: UserPlus, variant: 'primary' as const }
  }
  return undefined
}

interface AdditionalActionsDeps {
  group: GroupData | undefined
  isMember: boolean
  canManage: boolean
  onLeave: () => void
  onAddMember: () => void
  onInvite: () => void
}

function buildAdditionalActions({ group, isMember, canManage, onLeave, onAddMember, onInvite }: AdditionalActionsDeps) {
  const actions: Array<{ label: string; onClick: () => void; icon?: React.ElementType; variant?: 'default' | 'danger' }> = []
  if (isMember && !group?.isGlobal) {
    actions.push({ label: 'Salir del grupo', onClick: onLeave, icon: LogOut, variant: 'danger' })
  }
  if (canManage) {
    actions.push({ label: 'Agregar miembro', onClick: onAddMember, icon: UserPlus })
    if (group?.joinPolicy === 'INVITE') {
      actions.push({ label: 'Invitar usuario', onClick: onInvite, icon: UserPlus })
    }
  }
  return actions.length > 0 ? actions : undefined
}

// ───────────────────────────── actions (one hook per concern) ─────────────────────────────

/** What the user does with their own membership: join, cancel a request, leave, and (lead/admin) delete the group. */
function useMembershipActions(id: string, groupName: string | undefined) {
  const navigate = useNavigate()
  const { toast } = useToastContext()
  const joinMutation = useJoinGroup()
  const cancelRequestMutation = useCancelJoinRequest()
  const leaveMutation = useLeaveGroup()
  const deleteMutation = useDeleteGroup()
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleJoinOpen = async () => {
    try {
      await joinMutation.mutateAsync(id)
      toast({ variant: 'success', title: 'Te has unido al grupo' })
    } catch (err) {
      toast({ variant: 'error', title: 'Error al unirse al grupo', description: getErrorMessage(err) })
    }
  }

  const handleCancelRequest = async () => {
    try {
      await cancelRequestMutation.mutateAsync(id)
      toast({ variant: 'success', title: 'Solicitud cancelada' })
    } catch (err) {
      toast({ variant: 'error', title: 'Error al cancelar solicitud', description: getErrorMessage(err) })
    }
  }

  const handleLeave = async () => {
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
    } finally {
      setLeaveOpen(false)
    }
  }

  const handleDelete = async (confirmationName: string) => {
    if (confirmationName !== groupName) return
    try {
      await deleteMutation.mutateAsync({ id, data: { confirmationName } })
      toast({ variant: 'success', title: 'Grupo eliminado' })
      navigate(ROUTES.GROUPS)
    } catch (err) {
      toast({ variant: 'error', title: 'Error al eliminar grupo', description: getErrorMessage(err) })
    }
    setDeleteOpen(false)
  }

  return {
    leaveOpen,
    setLeaveOpen,
    deleteOpen,
    setDeleteOpen,
    isLeaving: leaveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    handleJoinOpen,
    handleCancelRequest,
    handleLeave,
    handleDelete,
  }
}

/** Lead/admin actions over existing members: change their role and remove them (after confirming). */
function useMemberManagement(id: string) {
  const { toast } = useToastContext()
  const removeMemberMutation = useRemoveMember()
  const changeRoleMutation = useChangeMemberRole()
  const [removeMemberTarget, setRemoveMemberTarget] = useState<string | null>(null)

  const handleRemoveMember = async () => {
    if (!removeMemberTarget) return
    try {
      await removeMemberMutation.mutateAsync({ groupId: id, nickname: removeMemberTarget })
      toast({ variant: 'success', title: 'Miembro eliminado' })
    } catch (err) {
      toast({ variant: 'error', title: 'Error al eliminar miembro', description: getErrorMessage(err) })
    } finally {
      setRemoveMemberTarget(null)
    }
  }

  const handleChangeRole = async (nickname: string, role: GroupRole) => {
    try {
      await changeRoleMutation.mutateAsync({ groupId: id, nickname, data: { role } })
      toast({ variant: 'success', title: 'Rol actualizado' })
    } catch (err) {
      toast({ variant: 'error', title: 'Error al cambiar rol', description: getErrorMessage(err) })
    }
  }

  return {
    removeMemberTarget,
    setRemoveMemberTarget,
    isRemoving: removeMemberMutation.isPending,
    handleRemoveMember,
    handleChangeRole,
  }
}

// ───────────────────────────── shared pieces ─────────────────────────────

/** "Estado" filter: one pill per option. */
function StatusPills({ options, selected, onSelect }: Readonly<{
  options: { value: string; label: string }[]
  selected: string
  onSelect: (value: string) => void
}>) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold text-neutral-text-muted mr-1">Estado</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={cn(
            'px-3 py-1 rounded-pill text-xs font-bold transition-colors',
            selected === opt.value
              ? 'bg-brand-primary text-neutral-surface'
              : 'bg-neutral-border/50 text-neutral-text-primary hover:bg-neutral-border'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function EmptyRow({ colSpan, children }: Readonly<{ colSpan: number; children: ReactNode }>) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-neutral-text-muted py-8">{children}</TableCell>
    </TableRow>
  )
}

function PersonCell({ name, nickname }: Readonly<{ name: string; nickname: string }>) {
  return (
    <div>
      <p className="font-medium">{name}</p>
      <p className="text-xs text-neutral-text-muted">@{nickname}</p>
    </div>
  )
}

// ───────────────────────────── tabs ─────────────────────────────

interface MembersTabProps {
  members: MembersData['members'] | undefined
  canManage: boolean
  isMember: boolean
  onChangeRole: (nickname: string, role: GroupRole) => void
  onRemove: (nickname: string) => void
}

function MemberActions({ member, onChangeRole, onRemove }: Readonly<{
  member: MembersData['members'][number]
  onChangeRole: MembersTabProps['onChangeRole']
  onRemove: MembersTabProps['onRemove']
}>) {
  const canBecomeLead = member.role === 'LEAD' || member.systemRole === 'COACH' || member.systemRole === 'ADMIN'
  let roleTitle = 'Solo Coaches y Administradores pueden ser líderes'
  if (member.role === 'LEAD') roleTitle = 'Hacer miembro'
  else if (canBecomeLead) roleTitle = 'Hacer líder'
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChangeRole(member.nickname, member.role === 'LEAD' ? 'MEMBER' : 'LEAD')}
        title={roleTitle}
        disabled={!canBecomeLead}
      >
        <Shield className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onRemove(member.nickname)} title="Eliminar">
        <UserMinus className="h-4 w-4 text-status-error" />
      </Button>
    </div>
  )
}

function MembersTab({ members, canManage, isMember, onChangeRole, onRemove }: Readonly<MembersTabProps>) {
  return (
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
            {members?.map((m) => (
              <TableRow key={m.userId}>
                <TableCell><PersonCell name={m.name} nickname={m.nickname} /></TableCell>
                <TableCell>
                  <Badge variant={m.role === 'LEAD' ? 'warning' : 'outline'}>{m.role === 'LEAD' ? 'Líder' : 'Miembro'}</Badge>
                </TableCell>
                <TableCell className="text-sm text-neutral-text-muted">{formatDate(m.joinedAt)}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <MemberActions member={m} onChangeRole={onChangeRole} onRemove={onRemove} />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(!members || members.length === 0) && (
              <EmptyRow colSpan={canManage ? 4 : 3}>
                {!isMember && !canManage
                  ? 'Debes ser miembro de este grupo para ver la lista de miembros.'
                  : 'No hay miembros'}
              </EmptyRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

interface RequestsTabProps {
  groupId: string
  data: RequestsData | undefined
  status: JoinRequestStatus | 'all'
  limit: number
  onStatusChange: (value: string) => void
  onLimitChange: (limit: number) => void
  onPageChange: (page: number) => void
}

function RequestsTab({ groupId, data, status, limit, onStatusChange, onLimitChange, onPageChange }: Readonly<RequestsTabProps>) {
  const { toast } = useToastContext()
  const processRequestMutation = useProcessJoinRequest()

  const handleProcessRequest = async (requestId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      await processRequestMutation.mutateAsync({ groupId, requestId, data: { status: newStatus } })
      toast({ variant: 'success', title: newStatus === 'APPROVED' ? 'Solicitud aprobada' : 'Solicitud rechazada' })
    } catch (err) {
      toast({ variant: 'error', title: 'Error al procesar solicitud', description: getErrorMessage(err) })
    }
  }

  return (
    <div className="space-y-4">
      <StatusPills options={REQUEST_STATUS_OPTIONS} selected={status} onSelect={onStatusChange} />
      {data && (
        <PaginationSummary
          total={data.pagination.total}
          totalLabel="solicitudes"
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          limit={limit}
          onLimitChange={onLimitChange}
        />
      )}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Solicitante</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><PersonCell name={r.requester.name} nickname={r.requester.nickname} /></TableCell>
                  <TableCell className="text-sm text-neutral-text-muted">{r.message || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={REQUEST_BADGE[r.status].variant}>{REQUEST_BADGE[r.status].label}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-text-muted">{formatDate(r.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {r.status === 'PENDING' && (
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleProcessRequest(r.id, 'APPROVED')} title="Aprobar">
                          <Check className="h-4 w-4 text-status-success" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleProcessRequest(r.id, 'REJECTED')} title="Rechazar">
                          <X className="h-4 w-4 text-status-error" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!data || data.requests.length === 0) && (
                <EmptyRow colSpan={5}>No hay solicitudes{status === 'all' ? '' : ' con este estado'}</EmptyRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {data && (
        <PaginationControls currentPage={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={onPageChange} />
      )}
    </div>
  )
}

interface InvitationsTabProps {
  data: InvitationsData | undefined
  limit: number
  onSizeChange: (limit: number) => void
  onPageChange: (page: number) => void
}

function InvitationsTab({ data, limit, onSizeChange, onPageChange }: Readonly<InvitationsTabProps>) {
  return (
    <div className="space-y-4">
      {data && (
        <PaginationSummary
          total={data.pagination.total}
          totalLabel="invitaciones"
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          limit={limit}
          onLimitChange={onSizeChange}
        />
      )}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invitado</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Expira</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.invitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{inv.invitee?.name ?? 'Invitación general'}</p>
                      {inv.invitee && (
                        <p className="text-xs text-neutral-text-muted">@{inv.invitee.nickname}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-text-muted">{inv.invitee?.email ?? '—'}</TableCell>
                  <TableCell className="text-sm text-neutral-text-muted">{formatDate(inv.expiresAt)}</TableCell>
                </TableRow>
              ))}
              {(!data || data.invitations.length === 0) && (
                <EmptyRow colSpan={3}>No hay invitaciones pendientes</EmptyRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {data && (
        <PaginationControls currentPage={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={onPageChange} />
      )}
    </div>
  )
}

function LeadsCard({ leads }: Readonly<{ leads: GroupData['leads'] }>) {
  return (
    <Card>
      <CardHeader><CardTitle>Líderes</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leads.map((l) => (
            <div
              key={l.userId}
              className="relative flex items-center gap-3 cursor-pointer hover:bg-neutral-background/50 rounded-lg p-2 -mx-2 transition-colors"
            >
              <div className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center font-bold text-sm shrink-0',
                getInitialColor(l.name)
              )}>
                {l.name.charAt(0).toUpperCase()}
              </div>
              <RowLink to={`/users/${l.nickname}`}>
                <p className="font-medium text-sm text-neutral-text-primary">{l.name}</p>
                <p className="text-xs text-neutral-text-muted">@{l.nickname}</p>
              </RowLink>
              <Badge variant="warning" className="ml-auto text-[10px]">Líder</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface InfoTabProps {
  group: GroupData
  activeContestsTotal: number
  contestsTotal: number
  materialsTotal: number
}

function InfoTab({ group, activeContestsTotal, contestsTotal, materialsTotal }: Readonly<InfoTabProps>) {
  return (
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
        <StatCard align="center" value={activeContestsTotal} label="Competencias activas" valueColor="text-status-success" />
        <StatCard align="center" value={contestsTotal} label="Competencias totales" />
        <StatCard align="center" value={materialsTotal} label="Materiales" />
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-neutral-text-muted">
              <Calendar className="h-4 w-4" />
              <span>Creado: <span className="font-medium text-neutral-text-primary">{formatDate(group.createdAt)}</span></span>
            </div>
            {group.updatedAt && (
              <div className="flex items-center gap-2 text-neutral-text-muted">
                <Clock className="h-4 w-4" />
                <span>Actualizado: <span className="font-medium text-neutral-text-primary">{formatDate(group.updatedAt)}</span></span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leaders with initial avatars */}
      {group.leads.length > 0 && <LeadsCard leads={group.leads} />}
    </div>
  )
}

function MaterialsTab({ groupId, materials, canManage }: Readonly<{
  groupId: string
  materials: MaterialsData['materials'] | undefined
  canManage: boolean
}>) {
  const navigate = useNavigate()
  const hasMaterials = !!materials && materials.length > 0
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-text-muted">
          Últimos materiales publicados en este grupo
        </p>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button size="sm" onClick={() => navigate(`/groups/${groupId}/materials/new`)}>
              Nuevo material
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/groups/${groupId}/materials`)}>
            Ver todos
          </Button>
        </div>
      </div>
      {hasMaterials ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-neutral-border">
              {materials.map((m) => (
                <MaterialListItem key={m.id} material={m} href={`/groups/${groupId}/materials/${m.id}`} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="py-8 text-center text-neutral-text-muted">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay materiales en este grupo</p>
          {canManage && (
            <Button size="sm" className="mt-3" onClick={() => navigate(`/groups/${groupId}/materials/new`)}>
              Crear primer material
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function ContestCard({ groupId, contest }: Readonly<{ groupId: string; contest: ContestsData['items'][number] }>) {
  return (
    <Card className="relative cursor-pointer hover:border-brand-primary/40 transition-colors">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <ContestStatusBadge status={contest.status} />
          <span className="text-xs text-neutral-text-muted">{formatDuration(contest.duration)}</span>
        </div>
        <h3 className="font-semibold text-neutral-text-primary leading-tight"><RowLink to={PATHS.contest(groupId, contest.id)}>{contest.name}</RowLink></h3>
        <div className="flex items-center gap-4 text-xs text-neutral-text-muted">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {new Date(contest.startTime).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {contest.participantCount}
          </span>
          <span className="flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" />
            {pluralize(contest.problemCount, 'problema')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

interface ContestsTabProps {
  groupId: string
  data: ContestsData | undefined
  status: ContestStatus | 'all'
  limit: number
  canManage: boolean
  onStatusChange: (value: string) => void
  onLimitChange: (limit: number) => void
  onPageChange: (page: number) => void
}

function ContestsTab({ groupId, data, status, limit, canManage, onStatusChange, onLimitChange, onPageChange }: Readonly<ContestsTabProps>) {
  const navigate = useNavigate()
  const items = data?.items ?? []
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-text-muted">
          Competencias de este grupo
        </p>
        {canManage && (
          <Button size="sm" onClick={() => navigate(PATHS.contestNew(groupId))}>
            Nueva competencia
          </Button>
        )}
      </div>
      <StatusPills options={CONTEST_STATUS_OPTIONS} selected={status} onSelect={onStatusChange} />
      {data && (
        <PaginationSummary
          total={data.pagination.total}
          totalLabel="competencias"
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          limit={limit}
          onLimitChange={onLimitChange}
        />
      )}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((c) => <ContestCard key={c.id} groupId={groupId} contest={c} />)}
        </div>
      ) : (
        <div className="py-8 text-center text-neutral-text-muted">
          <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay competencias{status === 'all' ? ' en este grupo' : ' con este estado'}</p>
          {canManage && status === 'all' && (
            <Button size="sm" className="mt-3" onClick={() => navigate(PATHS.contestNew(groupId))}>
              Crear primera competencia
            </Button>
          )}
        </div>
      )}
      {data && (
        <PaginationControls currentPage={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={onPageChange} />
      )}
    </div>
  )
}

// ───────────────────────────── dialogs (each keeps its own form) ─────────────────────────────

function UserSearchField({ nickname, onNicknameChange, members }: Readonly<{
  nickname: string
  onNicknameChange: (value: string) => void
  members: MembersData['members'] | undefined
}>) {
  // GET /users/search allows any authenticated role — these dialogs are already only reachable
  // when canManage is true (group lead or platform Admin), so no extra gate is needed here.
  const debounced = useDebounce(nickname)
  const { data, isFetching } = useSearchUsers(debounced)
  return (
    <SearchSelect
      query={nickname}
      onQueryChange={onNicknameChange}
      results={(data?.users ?? []).filter((u) => !members?.some((m) => m.nickname === u.nickname))}
      isSearching={isFetching}
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
      onSelect={(u) => onNicknameChange(u.nickname)}
    />
  )
}

// The forms of the three dialogs live in the page, not in the dialogs: the page returns early (error page) and that
// unmounts them, and what the user already typed must survive the query recovering.

function useAddMemberForm() {
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState<GroupRole>('MEMBER')
  return { nickname, setNickname, role, setRole }
}

type InviteMethod = 'nickname' | 'email'

function useInviteForm() {
  const [method, setMethod] = useState<InviteMethod>('nickname')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  return { method, setMethod, nickname, setNickname, email, setEmail, generatedUrl, setGeneratedUrl }
}

function useJoinRequestForm() {
  const [message, setMessage] = useState('')
  return { message, setMessage }
}

function AddMemberDialog({ groupId, open, onOpenChange, members, form }: Readonly<{
  groupId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  members: MembersData['members'] | undefined
  form: ReturnType<typeof useAddMemberForm>
}>) {
  const { toast } = useToastContext()
  const addMemberMutation = useAddMember()
  const { nickname, setNickname, role, setRole } = form

  const handleAddMember = async () => {
    if (!nickname.trim()) return
    try {
      await addMemberMutation.mutateAsync({ groupId, data: { nickname: nickname.trim(), role } })
      toast({ variant: 'success', title: 'Miembro agregado' })
      onOpenChange(false)
      setNickname('')
    } catch (err) {
      toast({ variant: 'error', title: 'Error al agregar miembro', description: getErrorMessage(err) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Agregar miembro</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Usuario</label>
            <UserSearchField nickname={nickname} onNicknameChange={setNickname} members={members} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Rol</label>
            <Select value={role} onValueChange={(v) => setRole(v as GroupRole)}>
              <SelectTrigger aria-label="Rol del miembro"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Miembro</SelectItem>
                <SelectItem value="LEAD">Líder</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAddMember} disabled={!nickname.trim()}>Agregar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InviteDialog({ groupId, open, onClose, members, form }: Readonly<{
  groupId: string
  open: boolean
  onClose: () => void
  members: MembersData['members'] | undefined
  form: ReturnType<typeof useInviteForm>
}>) {
  const { toast } = useToastContext()
  const inviteMutation = useCreateInvitation()
  const { method, setMethod, nickname, setNickname, email, setEmail, generatedUrl, setGeneratedUrl } = form

  const recipient = method === 'nickname' ? nickname.trim() : email.trim()

  const close = () => {
    onClose()
    setGeneratedUrl(null)
    setMethod('nickname')
  }

  const handleInvite = async () => {
    if (!recipient) return
    const data = method === 'nickname' ? { userNickname: recipient } : { userEmail: recipient }
    try {
      const response = await inviteMutation.mutateAsync({ groupId, data })
      toast({ variant: 'success', title: 'Invitación enviada' })
      // The backend never returns a ready-made link — only `id` — so the frontend builds it,
      // matching the same route the invitation email itself points to.
      setGeneratedUrl(`${globalThis.location.origin}${PATHS.groupAcceptInvitation(groupId, response.id)}`)
      setNickname('')
      setEmail('')
    } catch (err) {
      // ALREADY_MEMBER's generic text ("Ya eres miembro…") is written for the person joining;
      // here the lead is inviting someone else.
      const description = err instanceof ApiClientError && err.code === 'ALREADY_MEMBER'
        ? 'Ese usuario ya es miembro del grupo.'
        : getErrorMessage(err)
      toast({ variant: 'error', title: 'Error al enviar invitación', description })
    }
  }

  const handleCopyUrl = async () => {
    if (!generatedUrl) return
    await navigator.clipboard.writeText(generatedUrl)
    toast({ variant: 'success', title: 'Enlace copiado' })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) close() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Invitar usuario</DialogTitle></DialogHeader>
        {generatedUrl ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral-text-muted">
              Invitación generada. Comparte este enlace con la persona invitada (también se le envía automáticamente):
            </p>
            <div className="flex items-center gap-2">
              <Input value={generatedUrl} readOnly className="flex-1" />
              <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-1">
              <Button variant={method === 'nickname' ? 'primary' : 'outline'} size="sm" onClick={() => setMethod('nickname')}>
                Por nickname
              </Button>
              <Button variant={method === 'email' ? 'primary' : 'outline'} size="sm" onClick={() => setMethod('email')}>
                Por correo
              </Button>
            </div>
            {method === 'nickname' ? (
              <div>
                <label className="text-sm font-medium mb-1 block">Usuario</label>
                <UserSearchField nickname={nickname} onNicknameChange={setNickname} members={members} />
              </div>
            ) : (
              <Input label="Correo electrónico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
            )}
          </>
        )}
        <DialogFooter>
          {generatedUrl ? (
            <Button onClick={close}>Cerrar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={close}>Cancelar</Button>
              <Button onClick={handleInvite} isLoading={inviteMutation.isPending} disabled={!recipient}>
                Enviar invitación
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Join request dialog (REQUEST policy). */
function JoinRequestDialog({ groupId, open, onOpenChange, previousRequest, form }: Readonly<{
  groupId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  previousRequest: NonNullable<MyJoinRequest>['request'] | undefined
  form: ReturnType<typeof useJoinRequestForm>
}>) {
  const { toast } = useToastContext()
  const requestMutation = useCreateJoinRequest()
  const { message, setMessage } = form

  const handleSubmitRequest = async () => {
    try {
      await requestMutation.mutateAsync({ groupId, data: message.trim() ? { message: message.trim() } : undefined })
      toast({ variant: 'success', title: 'Solicitud enviada' })
      onOpenChange(false)
      setMessage('')
    } catch (err) {
      toast({ variant: 'error', title: 'Error al enviar la solicitud', description: getErrorMessage(err) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar ingreso</DialogTitle>
          <DialogDescription>Puedes agregar un mensaje opcional para los líderes del grupo.</DialogDescription>
        </DialogHeader>
        {previousRequest?.status === 'REJECTED' && (
          <div className="bg-status-warning/10 border border-status-warning/30 rounded-md p-3 text-sm text-status-warning">
            Tu solicitud anterior a este grupo fue rechazada
            {previousRequest.createdAt && ` el ${formatDate(previousRequest.createdAt)}`}.
            Puedes intentarlo de nuevo.
          </div>
        )}
        <Textarea
          label="Mensaje (opcional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Cuéntales por qué quieres unirte..."
          rows={4}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmitRequest} isLoading={requestMutation.isPending}>Enviar solicitud</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ───────────────────────────── page ─────────────────────────────

interface Tab {
  id: string
  label: string
  content: ReactNode
  badge?: number
}

/** Every list the page shows (members, requests, invitations, materials, contests) with its filters and paging. */
function useGroupLists(id: string, group: GroupData | undefined, canManage: boolean, isMember: boolean) {
  // Only group members (and admins) can list members — backend answers 403 to non-members.
  const { data: membersData } = useGroupMembers(id, undefined, { enabled: isMember || canManage })
  const [requestsStatus, setRequestsStatus] = useState<JoinRequestStatus | 'all'>('PENDING')
  const [requestsPageQuery, setRequestsPageQuery] = useState<PageQuery>({ page: 1, limit: 10 })
  // Only leads/admins can list requests (the backend answers 403 to anyone else).
  const { data: requestsData } = useJoinRequests(id, {
    status: requestsStatus === 'all' ? undefined : requestsStatus,
    page: requestsPageQuery.page,
    limit: requestsPageQuery.limit,
  }, { enabled: canManage })
  // Unfiltered count, so whether the tab exists doesn't depend on the status filter picked in it.
  const { data: allRequestsData } = useJoinRequests(id, { limit: 1 }, { enabled: canManage })
  const { data: myJoinRequest } = useMyJoinRequest(id, {
    enabled: !isMember && group?.joinPolicy === 'REQUEST',
  })
  const [invitationsPageQuery, setInvitationsPageQuery] = useState<PageQuery>({ page: 1, limit: 10 })
  const { data: invitationsData } = useInvitations(id, invitationsPageQuery, { enabled: canManage })
  const { data: materialsData } = useMaterials(id, { limit: 5 })
  const [contestsStatus, setContestsStatus] = useState<ContestStatus | 'all'>('all')
  const [contestsPageQuery, setContestsPageQuery] = useState<PageQuery>({ page: 1, limit: 10 })
  // Consultas independientes del filtro interactivo de la pestaña, solo para las
  // tarjetas de resumen — el backend no calcula contestCount/activeContestCount en
  // el detalle del grupo (a diferencia de memberCount), así que se derivan aquí.
  const { data: contestsOverviewData } = useContests(id, { limit: 1 })
  const { data: activeContestsOverviewData } = useContests(id, { limit: 1, status: 'ACTIVE' })
  const { data: contestsData } = useContests(id, {
    status: contestsStatus === 'all' ? undefined : contestsStatus,
    page: contestsPageQuery.page,
    limit: contestsPageQuery.limit,
    sortBy: 'startTime',
    sortOrder: 'desc',
  })

  const { handlePageChange: handleRequestsPageChange, handleLimitChange: handleRequestsLimitChange } = usePaginationHandlers(setRequestsPageQuery)
  const handleRequestsStatusChange = (value: string) => {
    setRequestsStatus(value as JoinRequestStatus | 'all')
    setRequestsPageQuery((p) => ({ ...p, page: 1 }))
  }
  const handleInvitationsPageChange = (page: number) => setInvitationsPageQuery((p) => ({ ...p, page }))
  const handleInvitationsSizeChange = (limit: number) => setInvitationsPageQuery({ page: 1, limit })
  const { handlePageChange: handleContestsPageChange, handleLimitChange: handleContestsLimitChange } = usePaginationHandlers(setContestsPageQuery)
  const handleContestsStatusChange = (value: string) => {
    setContestsStatus(value as ContestStatus | 'all')
    setContestsPageQuery((p) => ({ ...p, page: 1 }))
  }

  return {
    membersData,
    requestsData,
    allRequestsData,
    myJoinRequest,
    invitationsData,
    materialsData,
    contestsData,
    contestsOverviewData,
    activeContestsOverviewData,
    requestsStatus,
    requestsPageQuery,
    invitationsPageQuery,
    contestsStatus,
    contestsPageQuery,
    handleRequestsPageChange,
    handleRequestsLimitChange,
    handleRequestsStatusChange,
    handleInvitationsPageChange,
    handleInvitationsSizeChange,
    handleContestsPageChange,
    handleContestsLimitChange,
    handleContestsStatusChange,
  }
}

type GroupLists = ReturnType<typeof useGroupLists>

interface TabsDeps {
  id: string
  group: GroupData | undefined
  canManage: boolean
  isMember: boolean
  lists: GroupLists
  memberManagement: ReturnType<typeof useMemberManagement>
}

function buildTabs({ id, group, canManage, isMember, lists, memberManagement }: TabsDeps): Tab[] {
  // Join requests only exist under the REQUEST policy; keep the tab if the group still has any
  // (e.g. the policy changed afterwards) so they can still be processed.
  const showRequestsTab = canManage && (group?.joinPolicy === 'REQUEST' || (lists.allRequestsData?.pagination.total ?? 0) > 0)

  return [
    {
      id: 'info',
      label: 'Información',
      content: group ? (
        <InfoTab
          group={group}
          activeContestsTotal={lists.activeContestsOverviewData?.pagination.total ?? 0}
          contestsTotal={lists.contestsOverviewData?.pagination.total ?? 0}
          materialsTotal={lists.materialsData?.pagination.total ?? 0}
        />
      ) : null,
    },
    {
      id: 'contests',
      label: 'Competencias',
      badge: lists.contestsData?.pagination.total,
      content: (
        <ContestsTab
          groupId={id}
          data={lists.contestsData}
          status={lists.contestsStatus}
          limit={lists.contestsPageQuery.limit}
          canManage={canManage}
          onStatusChange={lists.handleContestsStatusChange}
          onLimitChange={lists.handleContestsLimitChange}
          onPageChange={lists.handleContestsPageChange}
        />
      ),
    },
    {
      id: 'members',
      label: 'Miembros',
      badge: group?.statistics.memberCount,
      content: (
        <MembersTab
          members={lists.membersData?.members}
          canManage={canManage}
          isMember={isMember}
          onChangeRole={memberManagement.handleChangeRole}
          onRemove={memberManagement.setRemoveMemberTarget}
        />
      ),
    },
    {
      id: 'materials',
      label: 'Materiales',
      badge: lists.materialsData?.pagination.total,
      content: <MaterialsTab groupId={id} materials={lists.materialsData?.materials} canManage={canManage} />,
    },
    ...(showRequestsTab
      ? [{
          id: 'requests',
          label: 'Solicitudes',
          badge: lists.requestsData?.pagination.total,
          content: (
            <RequestsTab
              groupId={id}
              data={lists.requestsData}
              status={lists.requestsStatus}
              limit={lists.requestsPageQuery.limit}
              onStatusChange={lists.handleRequestsStatusChange}
              onLimitChange={lists.handleRequestsLimitChange}
              onPageChange={lists.handleRequestsPageChange}
            />
          ),
        }]
      : []),
    ...(canManage
      ? [{
          id: 'invitations',
          label: 'Invitaciones',
          badge: lists.invitationsData?.pagination.total,
          content: (
            <InvitationsTab
              data={lists.invitationsData}
              limit={lists.invitationsPageQuery.limit}
              onSizeChange={lists.handleInvitationsSizeChange}
              onPageChange={lists.handleInvitationsPageChange}
            />
          ),
        }]
      : []),
  ]
}

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  const { data: group, isLoading, error } = useGroupDetail(id!)
  const isLead = group?.userMembership.role === 'LEAD'
  const canManage = isLead || user?.role === 'ADMIN'
  const isMember = group?.userMembership.isMember ?? false
  const lists = useGroupLists(id!, group, canManage, isMember)

  const membership = useMembershipActions(id!, group?.name)
  const memberManagement = useMemberManagement(id!)

  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const addMemberForm = useAddMemberForm()
  const inviteForm = useInviteForm()
  const joinRequestForm = useJoinRequestForm()

  if (!id) return null
  if (isNotFoundError(error)) return <NotFoundPage />
  if (error) return <ErrorPage />

  const tabs = buildTabs({ id, group, canManage, isMember, lists, memberManagement })

  // Kept in the URL (?tab=...) so navigating away (e.g. to create a contest) and back
  // returns to the tab you were on, instead of always resetting to "Información".
  const requestedTab = searchParams.get('tab')
  const activeTab = requestedTab && tabs.some((t) => t.id === requestedTab) ? requestedTab : 'info'
  const handleTabChange = (tabId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (tabId === 'info') next.delete('tab')
      else next.set('tab', tabId)
      return next
    }, { replace: true })
  }

  const canEditOrDelete = canManage && !group?.isGlobal

  return (
    <>
      <EntityDetailPage
        title={group?.name ?? ''}
        subtitle={group?.description ?? undefined}
        badges={buildBadges(group)}
        breadcrumbs={[{ label: 'Grupos', href: ROUTES.GROUPS }, { label: group?.name ?? 'Cargando...' }]}
        isLoading={isLoading}
        metadata={[]}
        tabs={tabs}
        defaultTab="info"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onEdit={canEditOrDelete ? () => navigate(`/groups/${id}/edit`) : undefined}
        onDelete={canEditOrDelete ? () => membership.setDeleteOpen(true) : undefined}
        primaryAction={buildPrimaryAction({
          group,
          isMember,
          myJoinRequest: lists.myJoinRequest,
          onCancelRequest: membership.handleCancelRequest,
          onJoin: membership.handleJoinOpen,
          onRequest: () => setRequestOpen(true),
        })}
        additionalActions={buildAdditionalActions({
          group,
          isMember,
          canManage,
          onLeave: () => membership.setLeaveOpen(true),
          onAddMember: () => setAddMemberOpen(true),
          onInvite: () => setInviteOpen(true),
        })}
      />

      {/* Delete confirmation: shows what is lost and asks for the confirmation in steps */}
      {group && (
        <GroupDeletionDialog
          // remounted on every open/close, so nothing typed or ticked survives a failed deletion
          key={membership.deleteOpen ? 'open' : 'closed'}
          open={membership.deleteOpen}
          onOpenChange={membership.setDeleteOpen}
          groupId={id}
          groupName={group.name}
          isDeleting={membership.isDeleting}
          onConfirm={membership.handleDelete}
        />
      )}

      <ConfirmDialog
        open={membership.leaveOpen}
        onOpenChange={membership.setLeaveOpen}
        title="Salir del grupo"
        description="¿Seguro que deseas salir del grupo? También se cancelarán tus inscripciones individuales a las competencias programadas de este grupo."
        confirmLabel="Salir"
        variant="warning"
        onConfirm={membership.handleLeave}
        isLoading={membership.isLeaving}
      />

      <ConfirmDialog
        open={!!memberManagement.removeMemberTarget}
        onOpenChange={(open) => !open && memberManagement.setRemoveMemberTarget(null)}
        title="Eliminar miembro"
        description={`¿Eliminar a @${memberManagement.removeMemberTarget} del grupo?`}
        confirmLabel="Eliminar"
        variant="warning"
        onConfirm={memberManagement.handleRemoveMember}
        isLoading={memberManagement.isRemoving}
      />

      <AddMemberDialog groupId={id} open={addMemberOpen} onOpenChange={setAddMemberOpen} members={lists.membersData?.members} form={addMemberForm} />
      <InviteDialog groupId={id} open={inviteOpen} onClose={() => setInviteOpen(false)} members={lists.membersData?.members} form={inviteForm} />
      <JoinRequestDialog groupId={id} open={requestOpen} onOpenChange={setRequestOpen} previousRequest={lists.myJoinRequest?.request} form={joinRequestForm} />
    </>
  )
}
