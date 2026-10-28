import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Users, Clock, Code2, Search, ArrowRight, BarChart3, CheckCircle } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { EmptyState } from '@/components/patterns'
import { Card, CardContent, Input } from '@/components/ui'
import { Checkbox } from '@/components/ui/Checkbox'
import { PaginationControls, PaginationSummary } from '@/components/ui/Pagination'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { ParticipationModeTag } from '@/components/features/ParticipationModeTag'
import { useMyContests } from '@/hooks/api/useContests'
import { PATHS } from '@/lib/constants'
import { RowLink } from '@/components/ui/RowLink'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDuration, pluralize } from '@/lib/utils'
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

function ContestRow({ contest, href }: { contest: ContestListItem; href: string }) {
  const isFinished = contest.status === 'FINISHED'
  return (
    <Link
      to={href}
      className="w-full flex items-center justify-between gap-4 px-4 py-3 bg-neutral-surface border border-neutral-border rounded-lg hover:border-brand-primary/40 hover:shadow-elevation-1 transition-all text-left"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <p className="font-semibold text-neutral-text-primary truncate">{contest.name}</p>
          <p className="text-xs text-neutral-text-muted truncate">{contest.group.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 text-xs text-neutral-text-muted">
        {contest.isRegistered && (
          <span className="hidden sm:flex items-center gap-1 text-brand-primary font-bold uppercase tracking-wider">
            <CheckCircle className="h-3.5 w-3.5" />
            {isFinished ? 'Participado' : 'Inscrito'}
          </span>
        )}
        <ParticipationModeTag mode={contest.participationMode} className="hidden sm:inline-flex" />
        <span className="hidden sm:flex items-center gap-1"><Users className="h-3.5 w-3.5" />{contest.participantCount}</span>
        {contest.status !== 'SCHEDULED' && (
          <span className="hidden md:flex items-center gap-1"><Code2 className="h-3.5 w-3.5" />{pluralize(contest.problemCount, 'problema')}</span>
        )}
        <span className="font-mono whitespace-nowrap">{isFinished ? relativeTime(contest.endTime) : formatDate(contest.startTime)}</span>
      </div>
    </Link>
  )
}

interface ContestSectionProps {
  title: string
  items: ContestListItem[]
  isLoading: boolean
  getContestHref: (contest: ContestListItem) => string
  variant?: 'cards' | 'rows'
  accent?: boolean
  footer?: ReactNode
}

function ContestSection({ title, items, isLoading, getContestHref, variant = 'cards', accent = false, footer }: ContestSectionProps) {
  if (!isLoading && items.length === 0) return null
  return (
    <div>
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-3">
        {accent && <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success" />
        </span>}
        <span className={accent ? 'text-status-success' : 'text-neutral-text-muted'}>{title}</span>
      </h2>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-5 bg-neutral-border rounded w-20" />
                  <div className="h-5 bg-neutral-border rounded w-3/4" />
                  <div className="h-4 bg-neutral-border rounded w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : variant === 'rows' ? (
        <div className="space-y-2">
          {items.map((contest) => (
            <ContestRow key={contest.id} contest={contest} href={getContestHref(contest)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((contest) => (
            <ContestCard key={contest.id} contest={contest} href={getContestHref(contest)} />
          ))}
        </div>
      )}
      {footer}
    </div>
  )
}

interface ContestCardProps {
  contest: ContestListItem
  href: string
  // Solo cuando la lista mezcla estados (Todas + búsqueda); en las secciones y con
  // filtro de estado el estado ya está implícito.
  showStatus?: boolean
}

function ContestCard({ contest, href, showStatus = false }: ContestCardProps) {
  const isActive = contest.status === 'ACTIVE'
  const isFinished = contest.status === 'FINISHED'

  return (
    <Card
      className={cn(
        'group/card relative cursor-pointer transition-all duration-200 flex flex-col',
        isActive && 'border-status-success/30 hover:shadow-elevation-2',
        isFinished && 'opacity-80 hover:opacity-100',
        !isActive && !isFinished && 'hover:shadow-elevation-2',
      )}
    >
      <CardContent className="p-5 flex flex-col flex-1">
        {/* Top: badges + date */}
        {/* In a narrow card the two groups used to squeeze each other (the date broke in two lines and
            "Participando" touched the mode tag): now each group keeps its own line when they do not fit. */}
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 mb-3">
          <div className="flex items-center gap-2 whitespace-nowrap">
            {showStatus && <ContestStatusBadge status={contest.status} />}
            <ParticipationModeTag mode={contest.participationMode} />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 whitespace-nowrap">
            {contest.isRegistered && (
              <span className="flex items-center gap-1 text-brand-primary">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {isActive ? 'Participando' : isFinished ? 'Participado' : 'Inscrito'}
                </span>
              </span>
            )}
            <span className="text-xs font-medium text-neutral-text-muted font-mono">
              {isFinished ? relativeTime(contest.endTime) : formatDate(contest.startTime)}
            </span>
          </div>
        </div>

        {/* Title + description */}
        <h3 className="text-lg font-bold text-neutral-text-primary mb-1.5 group-hover:text-brand-primary transition-colors line-clamp-1">
          <RowLink to={href}>{contest.name}</RowLink>
        </h3>
        {contest.description && (
          <p className="text-sm text-neutral-text-muted line-clamp-2 mb-4">
            {contest.description}
          </p>
        )}
        {!contest.description && <div className="mb-4" />}

        {/* Metadata grid */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 whitespace-nowrap">
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
            <span className="text-xs font-medium">{pluralize(contest.problemCount, 'problema')}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto">
          {isActive && contest.isRegistered && (
            <span className="w-full bg-brand-primary text-white py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 group-hover/card:bg-brand-primary/90 transition-colors">
              Continuar competencia
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
          {isActive && !contest.isRegistered && (
            <span className="w-full bg-neutral-surface border border-neutral-border text-neutral-text-primary py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 group-hover/card:bg-neutral-background transition-colors">
              Ver competencia
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
          {contest.status === 'SCHEDULED' && contest.isRegistered && (
            <span className="w-full bg-neutral-surface border border-neutral-border text-neutral-text-muted py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 group-hover/card:bg-neutral-background transition-colors">
              Gestionar inscripción
            </span>
          )}
          {contest.status === 'SCHEDULED' && !contest.isRegistered && (
            <span className="w-full bg-neutral-surface border-2 border-brand-primary/20 text-brand-primary py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 group-hover/card:bg-brand-primary-muted transition-colors">
              Registrarse
            </span>
          )}
          {isFinished && (
            <span className="w-full bg-neutral-surface border border-neutral-border text-neutral-text-primary py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 group-hover/card:bg-neutral-background transition-colors">
              Ver resultados
              <BarChart3 className="h-4 w-4" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ContestsPage() {
  const [statusFilter, setStatusFilter] = useState<ContestStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  // The server does not know which contests the user is in, so this filters what was loaded
  // (the first 20 of each section, or the current page): enough for a person's own contests.
  const [onlyMine, setOnlyMine] = useState(false)

  // Sin filtro de estado ni búsqueda, agrupamos por estado (como Codeforces) en vez
  // de una sola lista ordenada por start_time DESC, donde una competencia Programada
  // para dentro de un año tapa a una que está En curso ahora mismo.
  const isGroupedView = statusFilter === 'ALL' && !debouncedSearch

  const { data, isLoading } = useMyContests(
    {
      page,
      limit,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      search: debouncedSearch || undefined,
    },
    { enabled: !isGroupedView },
  )

  const { data: activeData, isLoading: isLoadingActive } = useMyContests(
    { limit: 20, status: 'ACTIVE', sortBy: 'startTime', sortOrder: 'asc' },
    { enabled: isGroupedView },
  )
  const { data: scheduledData, isLoading: isLoadingScheduled } = useMyContests(
    { limit: 20, status: 'SCHEDULED', sortBy: 'startTime', sortOrder: 'asc' },
    { enabled: isGroupedView },
  )
  const { data: finishedData, isLoading: isLoadingFinished } = useMyContests(
    { limit: 20, status: 'FINISHED', sortBy: 'startTime', sortOrder: 'desc' },
    { enabled: isGroupedView },
  )

  const mine = (items: ContestListItem[] = []) => (onlyMine ? items.filter((c) => c.isRegistered) : items)
  const filteredItems = mine(data?.items)
  const activeItems = mine(activeData?.items)
  const scheduledItems = mine(scheduledData?.items)
  const finishedItems = mine(finishedData?.items)
  const moreFinished = (finishedData?.pagination.total ?? 0) > (finishedData?.items.length ?? 0)
  const contestHref = (contest: ContestListItem) => PATHS.contest(contest.group.id, contest.id)

  return (
    <AppLayout
      breadcrumbs={[
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
              Todas las competencias de tus grupos
            </p>
          </div>
        </div>

        {/* Search + pill filters */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
          <div className="relative flex-1 min-w-[14rem] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
            <Input
              placeholder="Buscar competencias..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-10"
            />
          </div>
          <div className="flex max-w-full items-center gap-1 overflow-x-auto bg-neutral-surface border border-neutral-border p-1 rounded-lg">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1) }}
                className={cn(
                  'shrink-0 px-3 sm:px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors',
                  statusFilter === f.value
                    ? 'bg-white shadow-sm text-brand-primary'
                    : 'text-neutral-text-muted hover:text-neutral-text-primary',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-text-primary cursor-pointer select-none">
            <Checkbox checked={onlyMine} onCheckedChange={(v) => { setOnlyMine(v === true); setPage(1) }} />
            Solo en las que participé
          </label>
        </div>

        {/* Grid */}
        {isGroupedView ? (
          (() => {
            const allEmpty = !isLoadingActive && !isLoadingScheduled && !isLoadingFinished
              && activeItems.length === 0
              && scheduledItems.length === 0
              && finishedItems.length === 0
            if (allEmpty) {
              return (
                <EmptyState
                  icon={Trophy}
                  title="No hay competencias"
                  description={onlyMine ? 'No participas en ninguna de las competencias cargadas' : 'No tienes competencias en ninguno de tus grupos'}
                />
              )
            }
            return (
              <div className="space-y-8">
                <ContestSection title="En curso" items={activeItems} isLoading={isLoadingActive} getContestHref={contestHref} accent />
                <ContestSection title="Próximas" items={scheduledItems} isLoading={isLoadingScheduled} getContestHref={contestHref} variant="rows" />
                <ContestSection
                  title="Finalizadas"
                  items={finishedItems}
                  isLoading={isLoadingFinished}
                  getContestHref={contestHref}
                  variant="rows"
                  footer={moreFinished && (
                    <button
                      type="button"
                      className="mt-3 text-sm font-medium text-brand-primary hover:underline"
                      onClick={() => { setStatusFilter('FINISHED'); setPage(1) }}
                    >
                      Ver todas las finalizadas ({finishedData?.pagination.total})
                    </button>
                  )}
                />
              </div>
            )
          })()
        ) : isLoading ? (
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
            description="No hay competencias con esos filtros"
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.map((contest) => (
                <ContestCard
                  key={contest.id}
                  contest={contest}
                  showStatus={statusFilter === 'ALL'}
                  href={contestHref(contest)}
                />
              ))}
            </div>
            {data && (
              <>
                <PaginationSummary
                  total={data.pagination.total}
                  totalLabel="competencias"
                  currentPage={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  limit={limit}
                  onLimitChange={(n) => { setLimit(n); setPage(1) }}
                />
                <PaginationControls currentPage={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
