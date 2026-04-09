import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Trophy, Plus, Users, Clock, Code2, Search, ArrowRight, BarChart3, CheckCircle } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { EmptyState } from '@/components/patterns'
import { Button, Card, CardContent, Input } from '@/components/ui'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { useContests } from '@/hooks/api/useContests'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Hace 1 día'
  if (days < 7) return `Hace ${days} días`
  if (days < 30) return `Hace ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? 's' : ''}`
  return formatDate(iso)
}

const STATUS_FILTERS = [
  { value: 'ALL' as const, label: 'Todos' },
  { value: 'ACTIVE' as const, label: 'En Curso' },
  { value: 'SCHEDULED' as const, label: 'Programados' },
  { value: 'FINISHED' as const, label: 'Finalizados' },
]

interface ContestCardProps { contest: ContestListItem; onClick: () => void }

function ContestCard({ contest, onClick }: ContestCardProps) {
  const isActive = contest.status === 'ACTIVE'
  const isFinished = contest.status === 'FINISHED'

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 flex flex-col',
        isActive && 'border-status-success/30 hover:shadow-elevation-2',
        isFinished && 'opacity-80 hover:opacity-100',
        !isActive && !isFinished && 'hover:shadow-elevation-2',
      )}
      onClick={onClick}
    >
      <CardContent className="p-5 flex flex-col flex-1">
        {/* Top: badges + date */}
        <div className="flex justify-between items-start mb-3">
          <ContestStatusBadge status={contest.status} />
          <div className="flex items-center gap-2">
            {contest.isRegistered && (
              <CheckCircle className="h-4 w-4 text-brand-primary" title={isActive ? 'Participando' : isFinished ? 'Participado' : 'Inscrito'} />
            )}
            <span className="text-xs font-medium text-neutral-text-muted font-mono">
              {isFinished ? relativeTime(contest.endTime) : formatDate(contest.startTime)}
            </span>
          </div>
        </div>

        {/* Title + description */}
        <h3 className="text-lg font-bold text-neutral-text-primary mb-1.5 group-hover:text-brand-primary transition-colors line-clamp-1">
          {contest.name}
        </h3>
        {contest.description && (
          <p className="text-sm text-neutral-text-muted line-clamp-2 mb-4">
            {contest.description}
          </p>
        )}
        {!contest.description && <div className="mb-4" />}

        {/* Metadata grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="flex items-center gap-2 text-neutral-text-muted">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">{formatDuration(contest.duration)}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-text-muted">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">{contest.participantCount}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-text-muted">
            <Code2 className="h-4 w-4" />
            <span className="text-xs font-medium">{contest.problemCount} problemas</span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto">
          {isActive && contest.isRegistered && (
            <button className="w-full bg-brand-primary text-white py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-colors">
              Continuar competencia
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {isActive && !contest.isRegistered && (
            <button className="w-full bg-neutral-surface border border-neutral-border text-neutral-text-primary py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-neutral-background transition-colors">
              Ver competencia
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {contest.status === 'SCHEDULED' && contest.isRegistered && (
            <button className="w-full bg-neutral-surface border border-neutral-border text-neutral-text-muted py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-neutral-background transition-colors">
              Gestionar inscripción
            </button>
          )}
          {contest.status === 'SCHEDULED' && !contest.isRegistered && (
            <button className="w-full bg-neutral-surface border-2 border-brand-primary/20 text-brand-primary py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-brand-primary-muted transition-colors">
              Registrarse
            </button>
          )}
          {isFinished && (
            <button className="w-full bg-neutral-surface border border-neutral-border text-neutral-text-primary py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-neutral-background transition-colors">
              Ver resultados
              <BarChart3 className="h-4 w-4" />
            </button>
          )}
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

  const filteredItems = (data?.data || []).filter((c) =>
    !debouncedSearch || c.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
  )

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Grupos', href: '/groups' },
        { label: 'Competencias' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-neutral-text-primary tracking-tight mb-1">
              Competencias
            </h1>
            <p className="text-neutral-text-muted">
              Competencias de programación del grupo
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => navigate(`/groups/${groupId}/contests/new`)} className="gap-2 self-start">
              <Plus className="h-4 w-4" />
              Nueva competencia
            </Button>
          )}
        </div>

        {/* Search + pill filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
            <Input
              placeholder="Buscar competencias..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-1 bg-neutral-surface border border-neutral-border p-1 rounded-lg">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1) }}
                className={cn(
                  'px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors',
                  statusFilter === f.value
                    ? 'bg-white shadow-sm text-brand-primary'
                    : 'text-neutral-text-muted hover:text-neutral-text-primary',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="animate-pulse space-y-3">
                    <div className="h-5 bg-neutral-border rounded w-20" />
                    <div className="h-5 bg-neutral-border rounded w-3/4" />
                    <div className="h-4 bg-neutral-border rounded w-full" />
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="h-4 bg-neutral-border rounded" />
                      <div className="h-4 bg-neutral-border rounded" />
                    </div>
                    <div className="h-10 bg-neutral-border rounded mt-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No hay competencias"
            description={statusFilter !== 'ALL' || debouncedSearch ? 'No hay competencias con esos filtros' : 'Aún no se han creado competencias en este grupo'}
            action={canCreate ? { label: 'Crear competencia', onClick: () => navigate(`/groups/${groupId}/contests/new`), icon: Plus } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredItems.map((contest) => (
              <ContestCard
                key={contest.id}
                contest={contest}
                onClick={() => navigate(`/contests/${contest.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
