import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui'
import { Input } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { PaginationControls, PaginationSummary } from '@/components/ui/Pagination'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { useContestDetail, useRegistrations } from '@/hooks/api/useContests'
import { useDebounce } from '@/hooks/useDebounce'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { PATHS } from '@/lib/constants'

export function ContestParticipantsPage() {
  const { groupId, id } = useParams<{ groupId: string; id: string }>()
  const { data: contest } = useContestDetail(groupId || '', id || '')

  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput)
  const [params, setParams] = useState<{ page: number; limit: number }>({ page: 1, limit: 10 })
  const { handlePageChange, handleLimitChange } = usePaginationHandlers(setParams)

  const { data, isLoading } = useRegistrations(groupId || '', id || '', {
    ...params,
    search: debouncedSearch || undefined,
  })

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Competencias', href: '/contests' },
        { label: contest?.name || '...', href: PATHS.contest(groupId || '', id || '') },
        { label: 'Participantes' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-neutral-text-primary">Participantes</h1>
          {contest && <ContestStatusBadge status={contest.status} />}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
          <Input
            placeholder="Buscar por nickname..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setParams((p) => ({ ...p, page: 1 })) }}
          />
        </div>

        {data && !isLoading && (
          <PaginationSummary
            total={data.pagination.total}
            totalLabel="participantes"
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            limit={data.pagination.limit}
            onLimitChange={handleLimitChange}
          />
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : data && data.registrations.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Registrado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.registrations.map((r) => (
                    <TableRow key={r.nickname}>
                      <TableCell>
                        <Link to={`/users/${r.nickname}`} className="text-brand-primary hover:underline">
                          @{r.nickname}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-neutral-text-muted">
                        {new Date(r.registeredAt).toLocaleString('es')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-12 text-neutral-text-muted">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {debouncedSearch ? 'Sin resultados para esa búsqueda.' : 'No hay participantes registrados.'}
          </div>
        )}

        {data && (
          <PaginationControls
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </AppLayout>
  )
}
