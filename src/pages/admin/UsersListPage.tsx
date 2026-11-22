import { useState, useEffect } from 'react'
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form'
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
import { useAdminUsers, useAdminUserFilterOptions, useAdminDeactivateUser, useAdminUpdateUser, useSoleLeadGroups } from '@/hooks/api/useUsers'
import { useToastContext } from '@/hooks/useToastContext'
import { useDebounce } from '@/hooks/useDebounce'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { ROLE_CONFIG } from '@/lib/constants'
import { adminUpdateUserSchema, type AdminUpdateUserFormData } from '@/lib/schemas/user'
import { ApiClientError } from '@/lib/errors'
import { getErrorMessage } from '@/lib/errorMessages'
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

function getConfirmDialogProps(action: PendingAction | null, soleLeadGroups: string[] = [], soleLeadLookupFailed = false) {
  if (!action) return null
  const { user, kind } = action

  if (kind === 'deactivate') {
    return {
      title: 'Desactivar usuario',
      description:
        `¿Desactivar al usuario @${user.nickname}? Esta acción es permanente y no se puede deshacer: su correo y nickname quedan anonimizados.` +
        (soleLeadGroups.length > 0
          ? ` Ojo: es el único líder de ${soleLeadGroups.map((n) => `«${n}»`).join(', ')}; ${soleLeadGroups.length === 1 ? 'ese grupo quedará' : 'esos grupos quedarán'} sin líder y solo un Administrador podrá gestionarlo${soleLeadGroups.length === 1 ? '' : 's'}. Considera nombrar antes a otro líder.`
          : '') +
        (soleLeadLookupFailed
          ? ' No se pudo comprobar si es el único líder de algún grupo: si lo es, ese grupo quedaría sin líder y solo un Administrador podría gestionarlo.'
          : ''),
    }
  }

  const targetRole = kind === 'promote' ? 'COACH' : 'CONTESTANT'
  return {
    title: 'Cambiar rol de usuario',
    description: `¿Seguro que quieres cambiar a @${user.nickname} de ${ROLE_CONFIG[user.role].label} a ${ROLE_CONFIG[targetRole].label}?`,
  }
}

/** Radix reports every open/close change; the dialogs here only react to closing. */
const onlyWhenClosed = (onClose: () => void) => (open: boolean) => {
  if (!open) onClose()
}

type ToastOptions = Parameters<ReturnType<typeof useToastContext>['toast']>[0]

/** The toast shown when confirming a role change or deactivation fails. */
function actionErrorToast(err: unknown, kind: PendingAction['kind']): ToastOptions {
  const code = err instanceof ApiClientError ? err.code : undefined
  if (code === 'CANNOT_SELF_DEACTIVATE') {
    return { variant: 'error', title: 'No puedes desactivar tu propia cuenta', description: 'Pídele a otro Administrador que lo haga por ti.' }
  }
  if (code === 'CANNOT_DEACTIVATE_ADMIN') {
    return { variant: 'error', title: 'No se puede desactivar a otro Administrador' }
  }
  return {
    variant: 'error',
    title: kind === 'deactivate' ? 'Error al desactivar usuario' : 'Error al actualizar rol',
    description: getErrorMessage(err),
  }
}

interface UserRowProps {
  user: UserWithId
  actionPending: boolean
  onEdit: (user: UserWithId) => void
  onAction: (action: PendingAction) => void
}

function UserRow({ user, actionPending, onEdit, onAction }: Readonly<UserRowProps>) {
  return (
    <TableRow>
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
          <UserActionsMenu user={user} disabled={actionPending} onEdit={onEdit} onAction={onAction} />
        )}
      </TableCell>
    </TableRow>
  )
}

interface UserActionsMenuProps {
  user: UserWithId
  disabled: boolean
  onEdit: (user: UserWithId) => void
  onAction: (action: PendingAction) => void
}

function UserActionsMenu({ user, disabled, onEdit, onAction }: Readonly<UserActionsMenuProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={disabled}
          aria-label={`Acciones para @${user.nickname}`}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(user)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar usuario
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.role === 'CONTESTANT' && (
          <DropdownMenuItem onClick={() => onAction({ user, kind: 'promote' })}>
            <ArrowUp className="mr-2 h-4 w-4" />
            Subir a Coach
          </DropdownMenuItem>
        )}
        {user.role === 'COACH' && (
          <DropdownMenuItem onClick={() => onAction({ user, kind: 'demote' })}>
            <ArrowDown className="mr-2 h-4 w-4" />
            Bajar a Competidor
          </DropdownMenuItem>
        )}
        {user.role !== 'ADMIN' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction({ user, kind: 'deactivate' })} className="text-status-error">
              <UserX className="mr-2 h-4 w-4" />
              Desactivar usuario
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface EditUserDialogProps {
  user: UserWithId | null
  form: UseFormReturn<AdminUpdateUserFormData>
  role: AdminUpdateUserFormData['role'] | undefined
  isSaving: boolean
  onSubmit: (formData: AdminUpdateUserFormData) => Promise<void>
  onClose: () => void
}

function EditUserDialog({ user, form, role, isSaving, onSubmit, onClose }: Readonly<EditUserDialogProps>) {
  const { errors } = form.formState
  return (
    <Dialog open={!!user} onOpenChange={onlyWhenClosed(onClose)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario {user && `@${user.nickname}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nombre" {...form.register('name')} error={errors.name?.message} />
          <Input label="Email" type="email" {...form.register('email')} error={errors.email?.message} />
          <Input label="Nickname" {...form.register('nickname')} error={errors.nickname?.message} />
          <Input label="Institución" {...form.register('institution')} error={errors.institution?.message} />
          <div>
            <label className="text-sm font-medium mb-1 block">Rol</label>
            <Select
              value={role}
              onValueChange={(v) => form.setValue('role', v as 'COACH' | 'CONTESTANT', { shouldValidate: true })}
            >
              <SelectTrigger aria-label="Rol del usuario"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTESTANT">{ROLE_CONFIG.CONTESTANT.label}</SelectItem>
                <SelectItem value="COACH">{ROLE_CONFIG.COACH.label}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" isLoading={isSaving}>Guardar cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type SortOption = (typeof SORT_OPTIONS)[number]

interface UserListFilters {
  page: number
  limit: number
  search: string
  role: UserRole | undefined
  status: UserStatus | undefined
  country: string | undefined
  city: string | undefined
  institution: string | undefined
  sort: SortOption | undefined
}

/** Only the filters that have a value go into the request. */
function buildUserListParams({ page, limit, search, role, status, country, city, institution, sort }: UserListFilters): AdminUserListParams {
  return {
    page,
    limit,
    ...(search && { search }),
    ...(role && { role }),
    ...(status && { status }),
    ...(country && { country }),
    ...(city && { city }),
    ...(institution && { institution }),
    ...(sort && { sortBy: sort.sortBy, sortOrder: sort.sortOrder }),
  }
}

interface UsersTableProps {
  users: UserWithId[]
  isActionPending: (userId: string) => boolean
  onEdit: (user: UserWithId) => void
  onAction: (action: PendingAction) => void
}

function UsersTable({ users, isActionPending, onEdit, onAction }: Readonly<UsersTableProps>) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-neutral-text-muted">
                  No se encontraron usuarios con estos filtros.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <UserRow key={user.id} user={user} actionPending={isActionPending(user.id)} onEdit={onEdit} onAction={onAction} />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function UsersListPage() {
  const { toast } = useToastContext()

  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<UserStatus | undefined>('ACTIVE')
  const [countryFilter, setCountryFilter] = useState<string | undefined>(undefined)
  const [cityFilter, setCityFilter] = useState<string | undefined>(undefined)
  const [institutionFilter, setInstitutionFilter] = useState<string | undefined>(undefined)
  const [sortValue, setSortValue] = useState<string>('createdAt-desc')
  const [pagination, setPagination] = useState({ page: 1, limit: 5 })
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [editingUser, setEditingUser] = useState<UserWithId | null>(null)

  const selectedSort = SORT_OPTIONS.find((s) => s.value === sortValue)

  const params = buildUserListParams({
    page: pagination.page,
    limit: pagination.limit,
    search: debouncedSearch,
    role: roleFilter,
    status: statusFilter,
    country: countryFilter,
    city: cityFilter,
    institution: institutionFilter,
    sort: selectedSort,
  })

  const { data, isLoading, error } = useAdminUsers(params)
  const { data: filterOptions } = useAdminUserFilterOptions()
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
        email: editingUser.email,
        nickname: editingUser.nickname,
        role: editingUser.role === 'ADMIN' ? undefined : editingUser.role,
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
    } catch (err) {
      toast({ variant: 'error', title: 'Error al actualizar el usuario', description: getErrorMessage(err) })
    }
  }

  const handleSearch = (search: string) => {
    setSearchInput(search)
    setPagination((p) => ({ ...p, page: 1 }))
  }

  // Each filter select uses 'ALL' for "no filter"; changing any filter goes back to the first page.
  const applyFilter = <T extends string>(set: (value: T | undefined) => void) => (value: string) => {
    set(value === 'ALL' ? undefined : (value as T))
    setPagination((p) => ({ ...p, page: 1 }))
  }
  const handleRoleFilter = applyFilter<UserRole>(setRoleFilter)
  const handleStatusFilter = applyFilter<UserStatus>(setStatusFilter)
  const handleCountryFilter = applyFilter(setCountryFilter)
  const handleCityFilter = applyFilter(setCityFilter)
  const handleInstitutionFilter = applyFilter(setInstitutionFilter)

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
    } catch (err) {
      toast(actionErrorToast(err, kind))
    }
    setPendingAction(null)
  }

  const deactivating = pendingAction?.kind === 'deactivate'
  const { data: soleLead, isLoading: isLoadingSoleLead, isError: soleLeadFailed } = useSoleLeadGroups(pendingAction?.user.id, deactivating)
  const confirmDialogProps = getConfirmDialogProps(pendingAction, soleLead?.groups.map((g) => g.name), deactivating && soleLeadFailed)

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
            <SelectTrigger aria-label="Filtrar por rol" className="w-[160px]">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los roles</SelectItem>
              <SelectItem value="ADMIN">{ROLE_CONFIG.ADMIN.label}</SelectItem>
              <SelectItem value="COACH">{ROLE_CONFIG.COACH.label}</SelectItem>
              <SelectItem value="CONTESTANT">{ROLE_CONFIG.CONTESTANT.label}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter ?? 'ALL'} onValueChange={handleStatusFilter}>
            <SelectTrigger aria-label="Filtrar por estado" className="w-[180px]">
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
            <SelectTrigger aria-label="Ordenar usuarios por" className="w-[190px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={countryFilter ?? 'ALL'} onValueChange={handleCountryFilter}>
            <SelectTrigger aria-label="Filtrar por país" className="flex-1"><SelectValue placeholder="País" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los países</SelectItem>
              {filterOptions?.countries.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cityFilter ?? 'ALL'} onValueChange={handleCityFilter}>
            <SelectTrigger aria-label="Filtrar por ciudad" className="flex-1"><SelectValue placeholder="Ciudad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las ciudades</SelectItem>
              {filterOptions?.cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={institutionFilter ?? 'ALL'} onValueChange={handleInstitutionFilter}>
            <SelectTrigger aria-label="Filtrar por institución" className="flex-1"><SelectValue placeholder="Institución" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las instituciones</SelectItem>
              {filterOptions?.institutions.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="error">
            {getErrorMessage(error, 'Error al cargar usuarios.')}
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

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )}

        {!isLoading && data && (
          <>
            <UsersTable
              users={data.users}
              isActionPending={isRowActionPending}
              onEdit={setEditingUser}
              onAction={setPendingAction}
            />
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </>
        )}
      </div>

      {confirmDialogProps && (
        <ConfirmDialog
          open={!!pendingAction}
          onOpenChange={onlyWhenClosed(() => setPendingAction(null))}
          title={confirmDialogProps.title}
          description={confirmDialogProps.description}
          variant="warning"
          onConfirm={handleConfirmAction}
          isLoading={activeMutation.isPending || (deactivating && isLoadingSoleLead)}
        />
      )}

      <EditUserDialog
        user={editingUser}
        form={editForm}
        role={editRole}
        isSaving={editUserMutation.isPending}
        onSubmit={onEditSubmit}
        onClose={() => setEditingUser(null)}
      />
    </AppLayout>
  )
}
