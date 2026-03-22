import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Clock, UsersRound } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Badge } from '@/components/ui'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { ContestCountdown } from '@/components/features/ContestCountdown'
import { useStandings } from '@/hooks/api/useContests'
import { cn } from '@/lib/utils'
import type { StandingProblemResult } from '@/types/contest'

function ProblemCell({ result }: { result: StandingProblemResult }) {
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
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useStandings(id || '')

  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Competencias', href: '/contests' },
        { label: data?.contest.name || '...', href: `/contests/${id}` },
        { label: 'Standings' },
      ]}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/contests/${id}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold text-neutral-text">Standings</h1>
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
          <div className="bg-status-warning/10 border border-status-warning/30 rounded-md p-3 text-sm text-status-warning">
            Los standings están congelados. Los resultados finales se revelarán al terminar el contest.
          </div>
        )}

        {/* Standings Table */}
        {isLoading ? (
          <div className="space-y-2">
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
                      {labels[p.position - 1] || p.position}
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
      </div>
    </AppLayout>
  )
}
