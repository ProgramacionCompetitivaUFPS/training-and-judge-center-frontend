import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import { Badge } from '@/components/ui'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import { ContestContextBar } from '@/components/features/ContestContextBar'
import { useContestSubmissions, useContestDetail } from '@/hooks/api/useContests'
import type { ContestSubmissionsParams } from '@/types/contest'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function ContestSubmissionsPage() {
  const { id } = useParams<{ id: string }>()

  const { data: contest } = useContestDetail(id || '')
  const groupId = contest?.group.id || ''

  const [phase, setPhase] = useState<string>('all')
  const [page, setPage] = useState(1)

  const params: ContestSubmissionsParams = {
    page,
    limit: 50,
    phase: phase !== 'all' ? (phase as 'competition' | 'postcompetition') : undefined,
  }

  const { data, isLoading } = useContestSubmissions(groupId, id || '', params)

  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  return (
    <>
      {contest && (
        <ContestContextBar
          contestId={id || ''}
          contestName={contest.name}
          status={contest.status}
          endTime={contest.endTime}
          currentView="Submissions"
        />
      )}
      <AppLayout
        showSidebar={false}
        maxWidth="full"
        breadcrumbs={[
          { label: 'Competencias', href: '/contests' },
          { label: contest?.name || '...', href: `/contests/${id}` },
          { label: 'Submissions' },
        ]}
      >
        <div className="space-y-4">
          {/* Phase filter */}
          <div className="flex items-center justify-end">
            <Select value={phase} onValueChange={(v) => { setPhase(v); setPage(1) }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fases</SelectItem>
                <SelectItem value="competition">Competencia</SelectItem>
                <SelectItem value="postcompetition">Post-competencia</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                {data.submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-mono text-sm">{formatTime(sub.submittedAt)}</TableCell>
                    <TableCell>
                      {sub.submittedBy.type === 'INDIVIDUAL'
                        ? sub.submittedBy.nickname
                        : sub.submittedBy.teamName}
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
                        <SubmissionStatusBadge status={sub.status as any} />
                      )}
                    </TableCell>
                    {data.contest.status === 'FINISHED' && (
                      <>
                        <TableCell>{sub.executionTime != null ? `${sub.executionTime}ms` : '-'}</TableCell>
                        <TableCell>{sub.memoryUsed != null ? `${sub.memoryUsed} MiB` : '-'}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-neutral-text-muted">
              No hay submissions en este contest.
            </div>
          )}
        </div>
      </AppLayout>
    </>
  )
}
