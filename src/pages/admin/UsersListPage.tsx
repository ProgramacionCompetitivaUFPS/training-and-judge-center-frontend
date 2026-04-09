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
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/Pagination'
import { useAdminUsers, useAdminDeactivateUser, useAdminChangeUserRole } from '@/hooks/api/useUsers'
import type { AdminUserListParams, UserRole, UserStatus } from '@/types/user'
import { Search, UserX } from 'lucide-react'

export function UsersListPage() {
  const [params, setParams] = useState<AdminUserListParams>({
    page: 1,
    limit: 20,
  })

  const { data, isLoading, error } = useAdminUsers(params)
  const deactivateMutation = useAdminDeactivateUser()
  const changeRoleMutation = useAdminChangeUserRole()

  const handleRoleChange = (nickname: string, newRole: UserRole) => {
    changeRoleMutation.mutate({ id: nickname, data: { role: newRole } })
  }

  const handleSearch = (search: string) => {
    setParams((prev) => ({ ...prev, search: search || undefined, page: 1 }))
  }

  const handleRoleFilter = (role: string) => {
    setParams((prev) => ({
      ...prev,
      role: (role === 'ALL' ? undefined : role) as UserRole | undefined,
      page: 1,
    }))
  }

  const handleStatusFilter = (status: string) => {
    setParams((prev) => ({
      ...prev,
      status: (status === 'ALL' ? undefined : status) as UserStatus | undefined,
      page: 1,
    }))
  }

  const handleDeactivate = async (id: string, nickname: string) => {
    if (!confirm(`¿Desactivar al usuario @${nickname}?`)) return
    await deactivateMutation.mutateAsync(id)
  }

  const totalPages = data?.pagination.totalPages ?? 1
  const currentPage = data?.pagination.currentPage ?? 1

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-neutral-text-primary">Gestión de Usuarios</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
            <Input
              placeholder="Buscar por nombre o nickname..."
              className="pl-9"
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
          <Select onValueChange={handleStatusFilter} defaultValue="ALL">
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

        {error && <Alert variant="error">Error al cargar usuarios.</Alert>}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : data ? (
          <>
            <Card className="overflow-hidden">
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
                  {data.data.map((user) => (
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
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleRoleChange(user.nickname, value as UserRole)}
                            >
                              <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                                <SelectItem value="COACH">Coach</SelectItem>
                                <SelectItem value="CONTESTANT">Contestant</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivate(user.nickname, user.nickname)}
                              title="Desactivar usuario"
                            >
                              <UserX className="h-4 w-4 text-status-error" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setParams((p) => ({ ...p, page: Math.max(1, currentPage - 1) }))}
                      disabled={currentPage <= 1}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const page = i + 1
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === currentPage}
                          onClick={() => setParams((p) => ({ ...p, page }))}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setParams((p) => ({ ...p, page: Math.min(totalPages, currentPage + 1) }))}
                      disabled={currentPage >= totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
