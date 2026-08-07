import { useState } from 'react'
import { AppLayout } from '@/components/layout'
import { Card } from '@/components/ui/Card'
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/Dropdown'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/Pagination'
import { useAdminUsers, useAdminDeactivateUser, useAdminUpdateUser } from '@/hooks/api/useUsers'
import { useToastContext } from '@/hooks/useToastContext'
import { useDebounce } from '@/hooks/useDebounce'
import type { AdminUserListParams, User, UserRole, UserStatus } from '@/types/user'
import { Search, MoreVertical, ArrowUp, ArrowDown, UserX } from 'lucide-react'

type PendingAction = {
  user: User
  kind: 'promote' | 'demote' | 'deactivate'
}

export function UsersListPage() {
  const { toast } = useToastContext()

  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<UserStatus | undefined>('ACTIVE')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(5)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const params: AdminUserListParams = {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(roleFilter && { role: roleFilter }),
    ...(statusFilter && { status: statusFilter }),
  }

  const { data, isLoading, error } = useAdminUsers(params)
  const deactivateMutation = useAdminDeactivateUser()
  const updateUserMutation = useAdminUpdateUser()

  const handleSearch = (search: string) => {
    setSearchInput(search)
    setPage(1)
  }

  const handleRoleFilter = (role: string) => {
    setRoleFilter(role === 'ALL' ? undefined : (role as UserRole))
    setPage(1)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status === 'ALL' ? undefined : (status as UserStatus))
    setPage(1)
  }

  const handleLimitChange = (value: string) => {
    setLimit(Number(value))
    setPage(1)
  }

  const isRowActionPending = (userId: string) =>
    pendingAction?.user.id === userId &&
    (pendingAction.kind === 'deactivate' ? deactivateMutation.isPending : updateUserMutation.isPending)

  const handleConfirmAction = async () => {
    if (!pendingAction) return
    const { user, kind } = pendingAction

    try {
      if (kind === 'deactivate') {
        await deactivateMutation.mutateAsync(user.id!)
        toast({ variant: 'success', title: 'Usuario desactivado' })
      } else {
        const newRole: UserRole = kind === 'promote' ? 'COACH' : 'CONTESTANT'
        await updateUserMutation.mutateAsync({ id: user.id!, data: { role: newRole } })
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

  const confirmDialogProps = (() => {
    if (!pendingAction) return null
    const { user, kind } = pendingAction

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
  })()

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
          <Select onValueChange={handleRoleFilter} defaultValue="ALL">
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
          <Select onValueChange={handleStatusFilter} defaultValue="ACTIVE">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="ACTIVE">Activo</SelectItem>
              <SelectItem value="DEACTIVATED">Desactivado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="error">
            {error instanceof Error ? error.message : 'Error al cargar usuarios.'}
          </Alert>
        )}

        {data && !isLoading && (
          <div className="flex items-center justify-between text-xs text-neutral-text-muted">
            <span>{data.pagination.total} usuarios en total</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Mostrar</span>
                <Select value={String(limit)} onValueChange={handleLimitChange}>
                  <SelectTrigger className="h-7 w-[64px] px-2 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>por página</span>
              </div>
              <span>Página {currentPage} de {totalPages}</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : data ? (
          <>
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-surface">
                  <tr>
                    <th className="text-left p-3 font-medium text-neutral-text-muted">Usuario</th>
                    <th className="text-left p-3 font-medium text-neutral-text-muted">Email</th>
                    <th className="text-left p-3 font-medium text-neutral-text-muted">Rol</th>
                    <th className="text-left p-3 font-medium text-neutral-text-muted">Estado</th>
                    <th className="text-right p-3 font-medium text-neutral-text-muted">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border">
                  {data.users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-neutral-text-muted">
                        No se encontraron usuarios con estos filtros.
                      </td>
                    </tr>
                  ) : (
                    data.users.map((user) => (
                      <tr key={user.nickname} className="hover:bg-neutral-surface/50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-neutral-text-primary">{user.name}</p>
                            <p className="text-xs text-neutral-text-muted">@{user.nickname}</p>
                          </div>
                        </td>
                        <td className="p-3 text-neutral-text-muted">{user.email}</td>
                        <td className="p-3">
                          <Badge variant={user.role === 'ADMIN' ? 'default' : user.role === 'COACH' ? 'primary' : 'outline'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={user.status === 'ACTIVE' ? 'default' : 'outline'}>
                            {user.status === 'ACTIVE' ? 'Activo' : 'Desactivado'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          {user.status === 'ACTIVE' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="shrink-0"
                                  disabled={isRowActionPending(user.id!)}
                                  aria-label={`Acciones para @${user.nickname}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
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
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNumber = i + 1
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          isActive={pageNumber === currentPage}
                          onClick={() => setPage(pageNumber)}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
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
          isLoading={pendingAction ? isRowActionPending(pendingAction.user.id!) : false}
        />
      )}
    </AppLayout>
  )
}
