import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Globe, Lock } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/Table'
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationPrevious, PaginationNext,
} from '@/components/ui/Pagination'
import { useGroups, useMyGroups } from '@/hooks/api/useGroups'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import type { GroupListParams, GroupListItem, MyGroupItem, MyGroupsParams } from '@/types/group'

const JOIN_POLICY_LABELS: Record<string, string> = {
  OPEN: 'Abierto',
  REQUEST: 'Solicitud',
  INVITE: 'Invitación',
}

const JOIN_POLICY_VARIANTS: Record<string, 'success' | 'warning' | 'default'> = {
  OPEN: 'success',
  REQUEST: 'warning',
  INVITE: 'default',
}

// Deterministic color from group name initial
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

export function GroupsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isCoachOrAdmin = user?.role === 'ADMIN' || user?.role === 'COACH'

  const [tab, setTab] = useState('all')
  const [allParams, setAllParams] = useState<GroupListParams>({ page: 1, limit: 10 })
  const [myParams, setMyParams] = useState<MyGroupsParams>({ page: 1, limit: 10 })
  const [allSearchInput, setAllSearchInput] = useState('')
  const [mySearchInput, setMySearchInput] = useState('')

  const debouncedAllSearch = useDebounce(allSearchInput)
  const debouncedMySearch = useDebounce(mySearchInput)

  const allQueryParams: GroupListParams = {
    ...allParams,
    search: debouncedAllSearch || undefined,
  }
  const myQueryParams: MyGroupsParams = {
    ...myParams,
    search: debouncedMySearch || undefined,
  }

  const allGroups = useGroups(allQueryParams)
  const myGroups = useMyGroups(myQueryParams)

  const allPagination = allGroups.data?.pagination
  const myPagination = myGroups.data?.pagination

  return (
    <AppLayout breadcrumbs={[{ label: 'Grupos' }]}>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-text-primary mb-1">Grupos</h1>
            <p className="text-sm text-neutral-text-muted">Explora grupos de entrenamiento o gestiona los tuyos</p>
          </div>
          {isCoachOrAdmin && (
            <Button onClick={() => navigate(ROUTES.GROUP_NEW)} className="gap-2">
              <Plus className="h-4 w-4" />Crear Grupo
            </Button>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">Todos los Grupos</TabsTrigger>
            <TabsTrigger value="mine">Mis Grupos</TabsTrigger>
          </TabsList>

          {/* === All Groups Tab === */}
          <TabsContent value="all" className="mt-4 space-y-4">
            {/* Search + filter inline */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
                <Input
                  placeholder="Buscar grupos..."
                  className="pl-9"
                  value={allSearchInput}
                  onChange={(e) => { setAllSearchInput(e.target.value); setAllParams((p) => ({ ...p, page: 1 })) }}
                />
              </div>
              <Select
                onValueChange={(v) => setAllParams((p) => ({ ...p, joinPolicy: v === 'ALL' ? undefined : v as GroupListParams['joinPolicy'], page: 1 }))}
                defaultValue="ALL"
              >
                <SelectTrigger className="w-44 shrink-0"><SelectValue placeholder="Política" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Toda política</SelectItem>
                  <SelectItem value="OPEN">Abierto</SelectItem>
                  <SelectItem value="REQUEST">Solicitud</SelectItem>
                  <SelectItem value="INVITE">Invitación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            {allPagination && !allGroups.isLoading && (allGroups.data?.groups.length ?? 0) > 0 && (
              <div className="flex items-center justify-between text-xs text-neutral-text-muted">
                <span>{allPagination.total} grupos</span>
                <span>Página {allPagination.page} de {allPagination.totalPages}</span>
              </div>
            )}

            {allGroups.error && <Alert variant="error">Error al cargar grupos.</Alert>}

            {allGroups.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : allGroups.data?.groups.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><p className="text-neutral-text-muted">No se encontraron grupos</p></CardContent></Card>
            ) : (
              <GroupsTable
                groups={allGroups.data?.groups ?? []}
                onRowClick={(g) => navigate(`/groups/${g.id}`)}
              />
            )}

            {allPagination && allPagination.totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  {allPagination.page > 1 && (
                    <PaginationItem><PaginationPrevious onClick={() => setAllParams((p) => ({ ...p, page: allPagination.page - 1 }))} /></PaginationItem>
                  )}
                  {Array.from({ length: Math.min(allPagination.totalPages, 5) }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}><PaginationLink isActive={page === allPagination.page} onClick={() => setAllParams((p) => ({ ...p, page }))}>{page}</PaginationLink></PaginationItem>
                  ))}
                  {allPagination.page < allPagination.totalPages && (
                    <PaginationItem><PaginationNext onClick={() => setAllParams((p) => ({ ...p, page: allPagination.page + 1 }))} /></PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            )}
          </TabsContent>

          {/* === My Groups Tab === */}
          <TabsContent value="mine" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
              <Input
                placeholder="Buscar en mis grupos..."
                className="pl-9"
                value={mySearchInput}
                onChange={(e) => { setMySearchInput(e.target.value); setMyParams((p) => ({ ...p, page: 1 })) }}
              />
            </div>

            {myGroups.error && <Alert variant="error">Error al cargar tus grupos.</Alert>}

            {/* Results count */}
            {myPagination && !myGroups.isLoading && (myGroups.data?.groups.length ?? 0) > 0 && (
              <div className="flex items-center justify-between text-xs text-neutral-text-muted">
                <span>{myPagination.total} grupos</span>
                <span>Página {myPagination.page} de {myPagination.totalPages}</span>
              </div>
            )}

            {myGroups.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : myGroups.data?.groups.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><p className="text-neutral-text-muted">Aún no perteneces a ningún grupo</p></CardContent></Card>
            ) : (
              <MyGroupsTable
                groups={myGroups.data?.groups ?? []}
                onRowClick={(g) => navigate(`/groups/${g.id}`)}
              />
            )}

            {myPagination && myPagination.totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  {myPagination.page > 1 && (
                    <PaginationItem><PaginationPrevious onClick={() => setMyParams((p) => ({ ...p, page: myPagination.page - 1 }))} /></PaginationItem>
                  )}
                  {Array.from({ length: Math.min(myPagination.totalPages, 5) }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}><PaginationLink isActive={page === myPagination.page} onClick={() => setMyParams((p) => ({ ...p, page }))}>{page}</PaginationLink></PaginationItem>
                  ))}
                  {myPagination.page < myPagination.totalPages && (
                    <PaginationItem><PaginationNext onClick={() => setMyParams((p) => ({ ...p, page: myPagination.page + 1 }))} /></PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}

// === Sub-components ===

interface GroupsTableProps {
  groups: GroupListItem[]
  onRowClick: (group: GroupListItem) => void
}

function GroupsTable({ groups, onRowClick }: GroupsTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grupo</TableHead>
              <TableHead>Visibilidad</TableHead>
              <TableHead>Política</TableHead>
              <TableHead className="text-center">Miembros</TableHead>
              <TableHead className="text-center">Contests activos</TableHead>
              <TableHead>Tu rol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow
                key={group.id}
                className="cursor-pointer hover:bg-neutral-bg/50"
                onClick={() => onRowClick(group)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs shrink-0',
                      getInitialColor(group.name)
                    )}>
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-text-primary truncate">{group.name}</span>
                        {group.isGlobal && <Badge variant="primary" className="text-[10px] py-0">Global</Badge>}
                      </div>
                      {group.description && (
                        <p className="text-xs text-neutral-text-muted truncate max-w-xs">{group.description}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-xs text-neutral-text-muted">
                    {group.visibility === 'VISIBLE' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {group.visibility === 'VISIBLE' ? 'Visible' : 'No visible'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={JOIN_POLICY_VARIANTS[group.joinPolicy] || 'default'} className="text-[10px]">
                    {JOIN_POLICY_LABELS[group.joinPolicy]}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-mono font-medium">{group.memberCount}</span>
                </TableCell>
                <TableCell className="text-center">
                  {group.activeContestCount > 0 ? (
                    <Badge variant="success" className="text-[10px]">{group.activeContestCount}</Badge>
                  ) : (
                    <span className="text-xs text-neutral-text-muted">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {group.userRole ? (
                    <Badge variant={group.userRole === 'LEAD' ? 'warning' : 'default'} className="text-[10px]">
                      {group.userRole === 'LEAD' ? 'Líder' : 'Miembro'}
                    </Badge>
                  ) : (
                    <span className="text-xs text-neutral-text-muted">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

interface MyGroupsTableProps {
  groups: MyGroupItem[]
  onRowClick: (group: MyGroupItem) => void
}

function MyGroupsTable({ groups, onRowClick }: MyGroupsTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grupo</TableHead>
              <TableHead>Tu rol</TableHead>
              <TableHead className="text-center">Miembros</TableHead>
              <TableHead className="text-center">Contests activos</TableHead>
              <TableHead className="text-center">Materiales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow
                key={group.id}
                className="cursor-pointer hover:bg-neutral-bg/50"
                onClick={() => onRowClick(group)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs shrink-0',
                      getInitialColor(group.name)
                    )}>
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-neutral-text-primary truncate block">{group.name}</span>
                      {group.description && (
                        <p className="text-xs text-neutral-text-muted truncate max-w-xs">{group.description}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={group.myRole === 'LEAD' ? 'warning' : 'default'} className="text-[10px]">
                    {group.myRole === 'LEAD' ? 'Líder' : 'Miembro'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-mono font-medium">{group.memberCount}</span>
                </TableCell>
                <TableCell className="text-center">
                  {group.activeContestCount > 0 ? (
                    <Badge variant="success" className="text-[10px]">{group.activeContestCount}</Badge>
                  ) : (
                    <span className="text-xs text-neutral-text-muted">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-mono font-medium">{group.materialCount}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
