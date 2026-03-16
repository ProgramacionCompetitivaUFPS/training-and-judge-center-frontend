import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
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
import { useGroups, useMyGroups } from '@/hooks/api/useGroups'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import type { GroupListParams, GroupListItem, MyGroupItem, MyGroupsParams } from '@/types/group'
import { Search, Plus, Users, Globe, Lock } from 'lucide-react'

const JOIN_POLICY_LABELS: Record<string, string> = {
  OPEN: 'Abierto',
  REQUEST: 'Solicitud',
  INVITE: 'Invitación',
}

const VISIBILITY_ICON = {
  VISIBLE: Globe,
  NOT_VISIBLE: Lock,
} as const

function GroupCard({ group, onClick }: { group: GroupListItem; onClick: () => void }) {
  const VisIcon = VISIBILITY_ICON[group.visibility]
  return (
    <Card className="cursor-pointer hover:shadow-elevation-2 transition-shadow" onClick={onClick}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-neutral-text-primary truncate">{group.name}</h3>
              {group.isGlobal && <Badge variant="primary">Global</Badge>}
              {group.userRole && (
                <Badge variant={group.userRole === 'LEAD' ? 'warning' : 'success'}>
                  {group.userRole === 'LEAD' ? 'Líder' : 'Miembro'}
                </Badge>
              )}
            </div>
            {group.description && (
              <p className="text-sm text-neutral-text-muted line-clamp-2 mb-2">{group.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-neutral-text-muted">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{group.memberCount} miembros</span>
              <span className="flex items-center gap-1"><VisIcon className="h-3 w-3" />{group.visibility === 'VISIBLE' ? 'Visible' : 'No visible'}</span>
              <span>{JOIN_POLICY_LABELS[group.joinPolicy]}</span>
              {group.activeContestCount > 0 && (
                <Badge variant="success">{group.activeContestCount} contest{group.activeContestCount > 1 ? 's' : ''} activo{group.activeContestCount > 1 ? 's' : ''}</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MyGroupCard({ group, onClick }: { group: MyGroupItem; onClick: () => void }) {
  return (
    <Card className="cursor-pointer hover:shadow-elevation-2 transition-shadow" onClick={onClick}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-neutral-text-primary truncate">{group.name}</h3>
              <Badge variant={group.myRole === 'LEAD' ? 'warning' : 'success'}>
                {group.myRole === 'LEAD' ? 'Líder' : 'Miembro'}
              </Badge>
            </div>
            {group.description && (
              <p className="text-sm text-neutral-text-muted line-clamp-2 mb-2">{group.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-neutral-text-muted">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{group.memberCount} miembros</span>
              {group.activeContestCount > 0 && (
                <Badge variant="success">{group.activeContestCount} activo{group.activeContestCount > 1 ? 's' : ''}</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function GroupsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isCoachOrAdmin = user?.role === 'ADMIN' || user?.role === 'COACH'

  const [tab, setTab] = useState('all')
  const [allParams, setAllParams] = useState<GroupListParams>({ page: 1, limit: 10 })
  const [myParams, setMyParams] = useState<MyGroupsParams>({ page: 1, limit: 10 })

  const allGroups = useGroups(allParams)
  const myGroups = useMyGroups(myParams)

  const handleSearchAll = (search: string) => {
    setAllParams((p) => ({ ...p, search: search || undefined, page: 1 }))
  }

  const handleSearchMy = (search: string) => {
    setMyParams((p) => ({ ...p, search: search || undefined, page: 1 }))
  }

  const allTotalPages = allGroups.data?.pagination.totalPages ?? 1
  const allCurrentPage = allGroups.data?.pagination.page ?? 1
  const myTotalPages = myGroups.data?.pagination.totalPages ?? 1
  const myCurrentPage = myGroups.data?.pagination.page ?? 1

  return (
    <AppLayout breadcrumbs={[{ label: 'Grupos' }]}>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-text-primary mb-1">Grupos</h1>
            <p className="text-neutral-text-muted">Explora grupos de entrenamiento o gestiona los tuyos</p>
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

          <TabsContent value="all" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
                <Input placeholder="Buscar grupos..." className="pl-9" onChange={(e) => handleSearchAll(e.target.value)} />
              </div>
              <Select onValueChange={(v) => setAllParams((p) => ({ ...p, joinPolicy: v === 'ALL' ? undefined : v as GroupListParams['joinPolicy'], page: 1 }))} defaultValue="ALL">
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Política de ingreso" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Toda política</SelectItem>
                  <SelectItem value="OPEN">Abierto</SelectItem>
                  <SelectItem value="REQUEST">Solicitud</SelectItem>
                  <SelectItem value="INVITE">Invitación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {allGroups.error && <Alert variant="error">Error al cargar grupos.</Alert>}

            {allGroups.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
            ) : allGroups.data?.groups.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><p className="text-neutral-text-muted">No se encontraron grupos</p></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {allGroups.data?.groups.map((g) => (
                  <GroupCard key={g.id} group={g} onClick={() => navigate(`/groups/${g.id}`)} />
                ))}
              </div>
            )}

            {allTotalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem><PaginationPrevious onClick={() => setAllParams((p) => ({ ...p, page: Math.max(1, allCurrentPage - 1) }))} disabled={allCurrentPage <= 1} /></PaginationItem>
                  {Array.from({ length: Math.min(allTotalPages, 5) }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}><PaginationLink isActive={page === allCurrentPage} onClick={() => setAllParams((p) => ({ ...p, page }))}>{page}</PaginationLink></PaginationItem>
                  ))}
                  <PaginationItem><PaginationNext onClick={() => setAllParams((p) => ({ ...p, page: Math.min(allTotalPages, allCurrentPage + 1) }))} disabled={allCurrentPage >= allTotalPages} /></PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </TabsContent>

          <TabsContent value="mine" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
              <Input placeholder="Buscar en mis grupos..." className="pl-9" onChange={(e) => handleSearchMy(e.target.value)} />
            </div>

            {myGroups.error && <Alert variant="error">Error al cargar tus grupos.</Alert>}

            {myGroups.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
            ) : myGroups.data?.groups.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><p className="text-neutral-text-muted">Aún no perteneces a ningún grupo</p></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {myGroups.data?.groups.map((g) => (
                  <MyGroupCard key={g.id} group={g} onClick={() => navigate(`/groups/${g.id}`)} />
                ))}
              </div>
            )}

            {myTotalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem><PaginationPrevious onClick={() => setMyParams((p) => ({ ...p, page: Math.max(1, myCurrentPage - 1) }))} disabled={myCurrentPage <= 1} /></PaginationItem>
                  {Array.from({ length: Math.min(myTotalPages, 5) }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}><PaginationLink isActive={page === myCurrentPage} onClick={() => setMyParams((p) => ({ ...p, page }))}>{page}</PaginationLink></PaginationItem>
                  ))}
                  <PaginationItem><PaginationNext onClick={() => setMyParams((p) => ({ ...p, page: Math.min(myTotalPages, myCurrentPage + 1) }))} disabled={myCurrentPage >= myTotalPages} /></PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
