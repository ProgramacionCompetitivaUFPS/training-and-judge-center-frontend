import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, UsersRound } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { PaginationControls, PaginationSummary } from '@/components/ui/Pagination'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { ContestCountdown } from '@/components/features/ContestCountdown'
import { useContestDetail, useStandings, useStandingsFilterOptions } from '@/hooks/api/useContests'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { PATHS } from '@/lib/constants'
import { cn, problemLabel } from '@/lib/utils'
import type { StandingProblemResult, StandingsParams } from '@/types/contest'

interface ProblemCellProps { result: StandingProblemResult }

function ProblemCell({ result }: ProblemCellProps) {
  if (result.status === 'NOT_ATTEMPTED') {
    return <span className="text-neutral-text-muted">-</span>
  }
  if (result.status === 'ACCEPTED') {
    return (
      <div className="text-center">
        <span className="text-status-success font-bold">+{result.attempts > 1 ? result.attempts - 1 : ''}</span>
        <br />
        <span className="text-xs text-neutral-text-muted">{result.time}</span>
      </div>
    )
  }
  if (result.status === 'PENDING') {
    return <span className="text-neutral-text-muted font-bold">?</span>
  }
  return <span className="text-status-error font-bold">-{result.attempts}</span>
}

export function ContestStandingsPage() {
  const { groupId, id } = useParams<{ groupId: string; id: string }>()

  const [countryFilter, setCountryFilter] = useState<string | undefined>(undefined)
  const [cityFilter, setCityFilter] = useState<string | undefined>(undefined)
  const [institutionFilter, setInstitutionFilter] = useState<string | undefined>(undefined)
  const [pagination, setPagination] = useState({ page: 1, limit: 50 })
  const { handlePageChange, handleLimitChange } = usePaginationHandlers(setPagination)

  const params: StandingsParams = {
    ...pagination,
    country: countryFilter,
    city: cityFilter,
    institution: institutionFilter,
  }

  const { data, isLoading } = useStandings(groupId || '', id || '', params)
  const { data: filterOptions } = useStandingsFilterOptions(groupId || '', id || '')
  const { data: contestDetail } = useContestDetail(groupId || '', id || '')

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
      <div className="space-y-4">
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
        </div>

        {data?.contest.isFrozen && (
          <div className="border rounded-md p-3 text-sm bg-status-warning/10 border-status-warning/30 text-status-warning">
            La tabla de posiciones está congelada. Los resultados finales se revelarán al terminar la competencia.
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={countryFilter ?? 'ALL'} onValueChange={handleCountryFilter}>
            <SelectTrigger className="w-36 h-8 px-2.5 py-1 text-sm"><SelectValue placeholder="País" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los países</SelectItem>
              {filterOptions?.countries.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cityFilter ?? 'ALL'} onValueChange={handleCityFilter}>
            <SelectTrigger className="w-36 h-8 px-2.5 py-1 text-sm"><SelectValue placeholder="Ciudad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las ciudades</SelectItem>
              {filterOptions?.cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={institutionFilter ?? 'ALL'} onValueChange={handleInstitutionFilter}>
            <SelectTrigger className="w-40 h-8 px-2.5 py-1 text-sm"><SelectValue placeholder="Institución" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las instituciones</SelectItem>
              {filterOptions?.institutions.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {data && !isLoading && (
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
        {isLoading ? (
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">#</TableHead>
                  <TableHead>Participante</TableHead>
                  <TableHead className="w-20 text-center">Resueltos</TableHead>
                  <TableHead className="w-20 text-center">Penalización</TableHead>
                  {data.problems.map((p) => (
                    <TableHead key={p.slug} className="w-20 text-center">
                      {problemLabel(p.position)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.standings.map((entry) => (
                  <TableRow key={entry.participant.id}>
                    <TableCell className="text-center font-bold">
                      {entry.rank <= 3 ? (
                        <span className={cn(
                          'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold',
                          entry.rank === 1 && 'bg-yellow-100 text-yellow-700',
                          entry.rank === 2 && 'bg-gray-100 text-gray-600',
                          entry.rank === 3 && 'bg-orange-100 text-orange-700',
                        )}>
                          {entry.rank}
                        </span>
                      ) : entry.rank}
                    </TableCell>
                    <TableCell>
                      <div>
                        {entry.participant.type === 'TEAM' ? (
                          <div>
                            <span className="font-medium text-neutral-text-primary flex items-center gap-1.5">
                              <UsersRound className="h-3.5 w-3.5 text-brand-primary" />
                              {entry.participant.displayName}
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Equipo</Badge>
                            </span>
                            {entry.participant.members && entry.participant.members.length > 0 && (
                              <span className="text-xs text-neutral-text-muted">
                                {entry.participant.members.join(', ')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            {entry.participant.nickname ? (
                              <Link to={`/users/${entry.participant.nickname}`} className="font-medium text-brand-primary hover:underline">
                                {entry.participant.displayName}
                              </Link>
                            ) : (
                              <span className="font-medium">{entry.participant.displayName}</span>
                            )}
                            {entry.participant.institution && (
                              <span className="text-xs text-neutral-text-muted ml-2">{entry.participant.institution}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-brand-primary">
                      {entry.problemsSolved}
                    </TableCell>
                    <TableCell className="text-center text-neutral-text-muted">
                      {entry.totalPenalty}
                    </TableCell>
                    {entry.problems.map((pr) => (
                      <TableCell key={pr.position} className={cn(
                        'text-center',
                        pr.status === 'ACCEPTED' && 'bg-status-success/5',
                        pr.status === 'WRONG_ANSWER' && 'bg-status-error/5',
                      )}>
                        <ProblemCell result={pr} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-text-muted">
            No hay standings disponibles aún.
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
