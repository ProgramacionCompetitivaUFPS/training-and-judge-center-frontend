import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Trophy, Plus, Calendar, Users, Clock, Search } from 'lucide-react'
import { EntityListPage, EmptyState } from '@/components/patterns'
import { Badge, Card, CardContent, Input } from '@/components/ui'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { useContests } from '@/hooks/api/useContests'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import type { ContestListItem, ContestStatus } from '@/types/contest'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

function ContestCard({ contest, onClick }: { contest: ContestListItem; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:shadow-elevation-2 transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-neutral-text truncate">{contest.name}</h3>
              <ContestStatusBadge status={contest.status} />
            </div>
            {contest.description && (
              <p className="text-sm text-neutral-text-muted line-clamp-2 mb-3">
                {contest.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-text-muted">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(contest.startTime)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(contest.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {contest.participantCount} participantes
              </span>
              <span>{contest.problemCount} problemas</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {contest.isRegistered && (
              <Badge variant="primary">Registrado</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ContestsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const groupId = searchParams.get('groupId') || 'group-1'
  const [statusFilter, setStatusFilter] = useState<ContestStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useContests(groupId, {
    page,
    limit: 20,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  })

  const canCreate = user?.role === 'ADMIN' || user?.role === 'COACH'

  // Client-side search filter (API doesn't support search yet)
  const filteredItems = (data?.data || []).filter((c) =>
    !debouncedSearch || c.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
  )

  return (
    <EntityListPage<ContestListItem>
      title="Competencias"
      description="Competencias de programación del grupo"
      breadcrumbs={[
        { label: 'Grupos', href: '/groups' },
        { label: 'Competencias' },
      ]}
      items={filteredItems}
      isLoading={isLoading}
      renderItem={(contest) => (
        <ContestCard
          key={contest.id}
          contest={contest}
          onClick={() => navigate(`/contests/${contest.id}`)}
        />
      )}
      onCreateNew={canCreate ? () => navigate(`/groups/${groupId}/contests/new`) : undefined}
      createButtonLabel="Nueva competencia"
      renderEmpty={() => (
        <EmptyState
          icon={Trophy}
          title="No hay competencias"
          description={statusFilter !== 'ALL' || debouncedSearch ? 'No hay competencias con esos filtros' : 'Aún no se han creado competencias en este grupo'}
          action={canCreate ? { label: 'Crear competencia', onClick: () => navigate(`/groups/${groupId}/contests/new`), icon: Plus } : undefined}
        />
      )}
      searchComponent={
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
            <Input
              placeholder="Buscar competencias..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as ContestStatus | 'ALL'); setPage(1) }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="SCHEDULED">Programados</SelectItem>
              <SelectItem value="ACTIVE">En curso</SelectItem>
              <SelectItem value="FINISHED">Finalizados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    />
  )
}
