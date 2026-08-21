import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, UsersRound, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge, Card, CardContent, Input } from '@/components/ui'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { PaginationControls, PaginationSummary } from '@/components/ui/Pagination'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { ContestCountdown } from '@/components/features/ContestCountdown'
import { useContestSubmissions, useContestDetail } from '@/hooks/api/useContests'
import { useGroupDetail } from '@/hooks/api/useGroups'
import { useDebounce } from '@/hooks/useDebounce'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { PATHS } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import type { ContestSubmissionsParams } from '@/types/contest'
import type { SubmissionStatus } from '@/types/submission'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function ContestSubmissionsPage() {
  const { groupId, id } = useParams<{ groupId: string; id: string }>()
  const { user } = useAuth()

  const { data: contest } = useContestDetail(groupId || '', id || '')
  const { data: ownerGroup } = useGroupDetail(groupId || '')

  const [phase, setPhase] = useState<string>('all')
  const [problemSlug, setProblemSlug] = useState<string>('all')
  const [nicknameInput, setNicknameInput] = useState('')
  const debouncedNickname = useDebounce(nicknameInput)
  const [pagination, setPagination] = useState({ page: 1, limit: 50 })
  const { handlePageChange, handleLimitChange } = usePaginationHandlers(setPagination)

  const params: ContestSubmissionsParams = {
    ...pagination,
    phase: phase !== 'all' ? (phase as 'competition' | 'postcompetition') : undefined,
    problemSlug: problemSlug !== 'all' ? problemSlug : undefined,
    nickname: debouncedNickname || undefined,
  }

  const { data, isLoading } = useContestSubmissions(groupId || '', id || '', params)

  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const isActive = data?.contest.status === 'ACTIVE' || contest?.status === 'ACTIVE'
  // Real leadership of the group that owns this contest, or platform Admin — mirrors the
  // freeze exemption already applied server-side in list_contest_submissions.go.
  const isPrivilegedViewer = user?.role === 'ADMIN' || ownerGroup?.userMembership.role === 'LEAD'

  // During ACTIVE contest, only own submissions are clickable — except for the organizer/Admin,
  // who (like the freeze exemption) can already see everyone's real verdict.
  const canViewSubmission = (nickname: string) => {
    if (!isActive) return true // FINISHED: all submissions viewable
    return nickname === user?.nickname || isPrivilegedViewer
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Competencias', href: '/contests' },
        { label: contest?.name || '...', href: PATHS.contest(groupId || '', id || '') },
        { label: 'Submissions' },
      ]}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-neutral-text-primary">Submissions</h1>
            {contest && <ContestStatusBadge status={contest.status} />}
          </div>
          {contest?.status === 'ACTIVE' && contest.endTime && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-neutral-text-muted" />
              <ContestCountdown
                targetTime={contest.endTime}
                className="[&>p]:text-sm [&>p]:font-mono [&>p]:text-neutral-text"
              />
            </div>
          )}
        </div>

        {/* Filters inline */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
            <Input
              placeholder="Filtrar por nickname..."
              className="pl-9"
              value={nicknameInput}
              onChange={(e) => { setNicknameInput(e.target.value); setPagination((p) => ({ ...p, page: 1 })) }}
            />
          </div>
          {contest && contest.problems.length > 0 && (
            <Select value={problemSlug} onValueChange={(v) => { setProblemSlug(v); setPagination((p) => ({ ...p, page: 1 })) }}>
              <SelectTrigger className="w-56 shrink-0">
                <SelectValue placeholder="Todos los problemas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los problemas</SelectItem>
                {contest.problems.map((p) => (
                  <SelectItem key={p.slug} value={p.slug}>
                    {labels[p.position - 1] || p.position} - {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={phase} onValueChange={(v) => { setPhase(v); setPagination((p) => ({ ...p, page: 1 })) }}>
            <SelectTrigger className="w-48 shrink-0">
              <SelectValue placeholder="Todas las fases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fases</SelectItem>
              <SelectItem value="competition">Competencia</SelectItem>
              <SelectItem value="postcompetition">Post-competencia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data && !isLoading && (
          <PaginationSummary
            total={data.pagination.total}
            totalLabel="envíos"
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            limit={pagination.limit}
            onLimitChange={handleLimitChange}
            sizeOptions={[25, 50, 100]}
          />
        )}

        {data?.contest.inFreeze && (
          <div className="bg-status-warning/10 border border-status-warning/30 rounded-md p-3 text-sm text-status-warning">
            El contest está en periodo de freeze. Algunas submissions muestran estado pendiente.
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : data && data.submissions.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Participante</TableHead>
                  <TableHead>Problema</TableHead>
                  <TableHead>Lenguaje</TableHead>
                  <TableHead>Veredicto</TableHead>
                  {data.contest.status === 'FINISHED' && (
                    <>
                      <TableHead>Tiempo</TableHead>
                      <TableHead>Memoria</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.submissions.map((sub) => {
                  const nickname = sub.submittedBy.type === 'INDIVIDUAL' ? sub.submittedBy.nickname : null
                  const displayName = sub.submittedBy.type === 'INDIVIDUAL'
                    ? sub.submittedBy.nickname
                    : sub.submittedBy.teamName
                  const clickable = nickname && canViewSubmission(nickname)

                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-mono text-sm">
                        {clickable ? (
                          <Link to={`/submissions/${sub.id}`} className="text-brand-primary hover:underline">
                            {formatTime(sub.submittedAt)}
                          </Link>
                        ) : formatTime(sub.submittedAt)}
                      </TableCell>
                      <TableCell>
                        {nickname ? (
                          <Link to={`/users/${nickname}`} className="text-brand-primary hover:underline">
                            {displayName}
                          </Link>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <UsersRound className="h-3.5 w-3.5 text-brand-accent" />
                            {displayName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold mr-1">
                          {labels[sub.problem.order - 1] || sub.problem.order}
                        </span>
                        {sub.problem.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sub.language}</Badge>
                      </TableCell>
                      <TableCell>
                        {sub.status === '?' ? (
                          <Badge variant="default">?</Badge>
                        ) : (
                          <SubmissionStatusBadge status={sub.status as SubmissionStatus} />
                        )}
                      </TableCell>
                      {data.contest.status === 'FINISHED' && (
                        <>
                          <TableCell>{sub.executionTime != null ? `${sub.executionTime}ms` : '-'}</TableCell>
                          <TableCell>{sub.memoryUsed != null ? `${sub.memoryUsed} MiB` : '-'}</TableCell>
                        </>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-12 text-neutral-text-muted">
            No hay submissions en este contest.
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
