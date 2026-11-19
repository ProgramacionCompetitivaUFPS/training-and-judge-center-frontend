import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { PaginationControls, PaginationSummary } from '@/components/ui/Pagination'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { ContestCountdown } from '@/components/features/ContestCountdown'
import { StandingsTable } from '@/components/features/StandingsTable'
import { StandingsPhaseTabs } from '@/components/features/StandingsPhaseTabs'
import { useContestDetail, useStandings, useStandingsFilterOptions } from '@/hooks/api/useContests'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { PATHS } from '@/lib/constants'
import type { StandingsParams, StandingsPhase } from '@/types/contest'

export function ContestStandingsPage() {
  const { groupId, id } = useParams<{ groupId: string; id: string }>()

  const [countryFilter, setCountryFilter] = useState<string | undefined>(undefined)
  const [cityFilter, setCityFilter] = useState<string | undefined>(undefined)
  const [institutionFilter, setInstitutionFilter] = useState<string | undefined>(undefined)
  const [phase, setPhase] = useState<StandingsPhase>('all')
  const [pagination, setPagination] = useState({ page: 1, limit: 50 })
  const { handlePageChange, handleLimitChange } = usePaginationHandlers(setPagination)

  const { data: contestDetail, isLoading: isLoadingDetail } = useContestDetail(groupId || '', id || '')
  const postEnabled = contestDetail?.enablePostContest === true && contestDetail.status === 'FINISHED'

  const params: StandingsParams = {
    ...pagination,
    country: countryFilter,
    city: cityFilter,
    institution: institutionFilter,
    // Sin post-competencia disponible se pide `competition` explícito, nunca se omite.
    phase: postEnabled ? phase : 'competition',
  }

  const { data, isLoading } = useStandings(groupId || '', id || '', params, { enabled: !isLoadingDetail })
  const showSkeleton = isLoading || isLoadingDetail
  const { data: filterOptions } = useStandingsFilterOptions(groupId || '', id || '')

  const handlePhaseChange = (next: StandingsPhase) => {
    setPhase(next)
    setPagination((p) => ({ ...p, page: 1 }))
  }

  const handleCountryFilter = (v: string) => { setCountryFilter(v === 'ALL' ? undefined : v); setPagination((p) => ({ ...p, page: 1 })) }
  const handleCityFilter = (v: string) => { setCityFilter(v === 'ALL' ? undefined : v); setPagination((p) => ({ ...p, page: 1 })) }
  const handleInstitutionFilter = (v: string) => { setInstitutionFilter(v === 'ALL' ? undefined : v); setPagination((p) => ({ ...p, page: 1 })) }

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Grupos', href: '/groups' },
        { label: contestDetail?.group.name || '...', href: groupId ? PATHS.group(groupId) : undefined },
        { label: data?.contest.name || '...', href: PATHS.contest(groupId || '', id || '') },
        { label: 'Tabla de Posiciones' },
      ]}
    >
      <div className="flex justify-center">
      <div className="w-full max-w-6xl space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-neutral-text-primary">Tabla de Posiciones</h1>
              {data && <ContestStatusBadge status={data.contest.status} />}
            </div>
            {data?.contest.status === 'ACTIVE' && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-neutral-text-muted" />
                <ContestCountdown
                  targetTime={data.contest.endTime}
                  className="[&>p]:text-sm [&>p]:font-mono [&>p]:text-neutral-text"
                />
              </div>
            )}
            {postEnabled && <StandingsPhaseTabs value={phase} onChange={handlePhaseChange} />}
          </div>

          {data?.contest.isFrozen && (
            <div className="border rounded-md p-3 text-sm bg-status-warning/10 border-status-warning/30 text-status-warning">
              La tabla de posiciones está congelada. Los resultados finales se revelarán al terminar la competencia.
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={countryFilter ?? 'ALL'} onValueChange={handleCountryFilter}>
              <SelectTrigger aria-label="Filtrar por país" className="w-36 h-8 px-2.5 py-1 text-sm"><SelectValue placeholder="País" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los países</SelectItem>
                {filterOptions?.countries.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityFilter ?? 'ALL'} onValueChange={handleCityFilter}>
              <SelectTrigger aria-label="Filtrar por ciudad" className="w-36 h-8 px-2.5 py-1 text-sm"><SelectValue placeholder="Ciudad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las ciudades</SelectItem>
                {filterOptions?.cities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={institutionFilter ?? 'ALL'} onValueChange={handleInstitutionFilter}>
              <SelectTrigger aria-label="Filtrar por institución" className="w-40 h-8 px-2.5 py-1 text-sm"><SelectValue placeholder="Institución" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las instituciones</SelectItem>
                {filterOptions?.institutions.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {data && !showSkeleton && (
            <PaginationSummary
              total={data.pagination.total}
              totalLabel="participantes"
              currentPage={data.pagination.page}
              totalPages={data.pagination.totalPages}
              limit={pagination.limit}
              onLimitChange={handleLimitChange}
              sizeOptions={[25, 50, 100]}
            />
          )}

          {/* Standings Table */}
          {showSkeleton ? (
            <div className="space-y-2">
              {/* The real table always has a header row (#, Participante, Resueltos, Penalización,
                  + una por problema) that doesn't exist until data arrives — without a placeholder
                  for it, that row pops in out of nowhere and shifts everything below it. */}
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data && data.standings.length > 0 ? (
            <StandingsTable problems={data.problems} entries={data.standings} phase={params.phase} />
          ) : (
            <div className="text-center py-12 text-neutral-text-muted">
              Todavía no hay posiciones para mostrar.
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
      </div>
    </AppLayout>
  )
}
