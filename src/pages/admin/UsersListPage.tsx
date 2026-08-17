import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/Select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/Dropdown'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PaginationControls, PaginationSummary } from '@/components/ui/Pagination'
import { useAdminUsers, useAdminDeactivateUser, useAdminUpdateUser } from '@/hooks/api/useUsers'
import { useToastContext } from '@/hooks/useToastContext'
import { useDebounce } from '@/hooks/useDebounce'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { ROLE_CONFIG } from '@/lib/constants'
import { adminUpdateUserSchema, type AdminUpdateUserFormData } from '@/lib/schemas/user'
import type { AdminUserListParams, User, UserRole, UserStatus } from '@/types/user'
import { Search, MoreVertical, ArrowUp, ArrowDown, UserX, Pencil } from 'lucide-react'

const SORT_OPTIONS: { value: string; label: string; sortBy: AdminUserListParams['sortBy']; sortOrder: 'asc' | 'desc' }[] = [
  { value: 'name-asc', label: 'Nombre (A-Z)', sortBy: 'name', sortOrder: 'asc' },
  { value: 'name-desc', label: 'Nombre (Z-A)', sortBy: 'name', sortOrder: 'desc' },
  { value: 'nickname-asc', label: 'Nickname (A-Z)', sortBy: 'nickname', sortOrder: 'asc' },
  { value: 'nickname-desc', label: 'Nickname (Z-A)', sortBy: 'nickname', sortOrder: 'desc' },
  { value: 'createdAt-desc', label: 'Más recientes primero', sortBy: 'createdAt', sortOrder: 'desc' },
  { value: 'createdAt-asc', label: 'Más antiguos primero', sortBy: 'createdAt', sortOrder: 'asc' },
]

type UserWithId = User & { id: string }

type PendingAction = {
  user: UserWithId
  kind: 'promote' | 'demote' | 'deactivate'
}

function getConfirmDialogProps(action: PendingAction | null) {
  if (!action) return null
  const { user, kind } = action

  if (kind === 'deactivate') {
    return {
      title: 'Desactivar usuario',
      description: `¿Desactivar al usuario @${user.nickname}? Podrá reactivarse más adelante.`,
    }
  }

  const targetRole = kind === 'promote' ? 'COACH' : 'CONTESTANT'
  return {
    title: 'Cambiar rol de usuario',
    description: `¿Seguro que quieres cambiar a @${user.nickname} de ${user.role} a ${targetRole}?`,
  }
}

export function UsersListPage() {
  const { toast } = useToastContext()

  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<UserStatus | undefined>('ACTIVE')
  const [sortValue, setSortValue] = useState<string>('createdAt-desc')
  const [pagination, setPagination] = useState({ page: 1, limit: 5 })
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [editingUser, setEditingUser] = useState<UserWithId | null>(null)

  const selectedSort = SORT_OPTIONS.find((s) => s.value === sortValue)

  const params: AdminUserListParams = {
    page: pagination.page,
    limit: pagination.limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(roleFilter && { role: roleFilter }),
    ...(statusFilter && { status: statusFilter }),
    ...(selectedSort && { sortBy: selectedSort.sortBy, sortOrder: selectedSort.sortOrder }),
  }

  const { data, isLoading, error } = useAdminUsers(params)
  const deactivateMutation = useAdminDeactivateUser()
  const updateUserMutation = useAdminUpdateUser()
  const editUserMutation = useAdminUpdateUser()
  const activeMutation = pendingAction?.kind === 'deactivate' ? deactivateMutation : updateUserMutation

  const editForm = useForm<AdminUpdateUserFormData>({
    resolver: zodResolver(adminUpdateUserSchema),
  })
  const editRole = useWatch({ control: editForm.control, name: 'role' })

  useEffect(() => {
    if (editingUser) {
      editForm.reset({
        name: editingUser.name,
        role: editingUser.role,
        institution: editingUser.institution,
      })
    }
  }, [editingUser, editForm])

  const onEditSubmit = async (formData: AdminUpdateUserFormData) => {
    if (!editingUser) return
    try {
      await editUserMutation.mutateAsync({ id: editingUser.id, data: formData })
      toast({ variant: 'success', title: 'Usuario actualizado' })
      setEditingUser(null)
    } catch {
      toast({ variant: 'error', title: 'Error al actualizar el usuario' })
    }
  }

  const handleSearch = (search: string) => {
    setSearchInput(search)
    setPagination((p) => ({ ...p, page: 1 }))
  }

  const handleRoleFilter = (role: string) => {
    setRoleFilter(role === 'ALL' ? undefined : (role as UserRole))
    setPagination((p) => ({ ...p, page: 1 }))
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status === 'ALL' ? undefined : (status as UserStatus))
    setPagination((p) => ({ ...p, page: 1 }))
  }

  const { handlePageChange, handleLimitChange } = usePaginationHandlers(setPagination)

  const isRowActionPending = (userId: string) =>
    pendingAction?.user.id === userId && activeMutation.isPending

  const handleConfirmAction = async () => {
    if (!pendingAction) return
    const { user, kind } = pendingAction

    try {
      if (kind === 'deactivate') {
        await deactivateMutation.mutateAsync(user.id)
        toast({ variant: 'success', title: 'Usuario desactivado' })
      } else {
        const newRole: UserRole = kind === 'promote' ? 'COACH' : 'CONTESTANT'
        await updateUserMutation.mutateAsync({ id: user.id, data: { role: newRole } })
        toast({ variant: 'success', title: 'Rol actualizado' })
      }
    } catch {
      toast({
        variant: 'error',
        title: kind === 'deactivate' ? 'Error al desactivar usuario' : 'Error al actualizar rol',
      })
    }
    setPendingAction(null)
  }

  const confirmDialogProps = getConfirmDialogProps(pendingAction)

  const totalPages = Math.max(data?.pagination.totalPages ?? 1, 1)
  const currentPage = data?.pagination.page ?? 1

  return (
    <AppLayout breadcrumbs={[{ label: 'Usuarios' }]}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-neutral-text-primary">Gestión de Usuarios</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
            <Input
              placeholder="Buscar por nombre o nickname..."
              className="pl-9"
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter ?? 'ALL'} onValueChange={handleRoleFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="COACH">Coach</SelectItem>
              <SelectItem value="CONTESTANT">Contestant</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter ?? 'ALL'} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="ACTIVE">Activo</SelectItem>
              <SelectItem value="DEACTIVATED">Desactivado</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortValue}
            onValueChange={(v) => { setSortValue(v); setPagination((p) => ({ ...p, page: 1 })) }}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="error">
            {error instanceof Error ? error.message : 'Error al cargar usuarios.'}
          </Alert>
        )}

        {data && !isLoading && (
          <PaginationSummary
            total={data.pagination.total}
            totalLabel="usuarios en total"
            currentPage={currentPage}
            totalPages={totalPages}
            limit={pagination.limit}
            onLimitChange={handleLimitChange}
          />
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : data ? (
          <>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-neutral-text-muted">
                          No se encontraron usuarios con estos filtros.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-neutral-text-primary">{user.name}</p>
                              <p className="text-xs text-neutral-text-muted">@{user.nickname}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-neutral-text-muted">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={ROLE_CONFIG[user.role].badgeVariant}>
                              {ROLE_CONFIG[user.role].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.status === 'ACTIVE' ? 'default' : 'outline'}>
                              {user.status === 'ACTIVE' ? 'Activo' : 'Desactivado'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {user.status === 'ACTIVE' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0"
                                    disabled={isRowActionPending(user.id)}
                                    aria-label={`Acciones para @${user.nickname}`}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingUser(user)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar usuario
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {user.role === 'CONTESTANT' && (
                                    <DropdownMenuItem onClick={() => setPendingAction({ user, kind: 'promote' })}>
                                      <ArrowUp className="mr-2 h-4 w-4" />
                                      Subir a Coach
                                    </DropdownMenuItem>
                                  )}
                                  {user.role === 'COACH' && (
                                    <DropdownMenuItem onClick={() => setPendingAction({ user, kind: 'demote' })}>
                                      <ArrowDown className="mr-2 h-4 w-4" />
                                      Bajar a Contestant
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setPendingAction({ user, kind: 'deactivate' })}
                                    className="text-status-error"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Desactivar usuario
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        ) : null}
      </div>

      {confirmDialogProps && (
        <ConfirmDialog
          open={!!pendingAction}
          onOpenChange={(open) => !open && setPendingAction(null)}
          title={confirmDialogProps.title}
          description={confirmDialogProps.description}
          variant="warning"
          onConfirm={handleConfirmAction}
          isLoading={activeMutation.isPending}
        />
      )}

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario {editingUser && `@${editingUser.nickname}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <Input
              label="Nombre"
              {...editForm.register('name')}
              error={editForm.formState.errors.name?.message}
            />
            <Input
              label="Institución"
              {...editForm.register('institution')}
              error={editForm.formState.errors.institution?.message}
            />
            <div>
              <label className="text-sm font-medium mb-1 block">Rol</label>
              <Select
                value={editRole}
                onValueChange={(v) => editForm.setValue('role', v as UserRole, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONTESTANT">Contestant</SelectItem>
                  <SelectItem value="COACH">Coach</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
              <Button type="submit" isLoading={editUserMutation.isPending}>Guardar cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
