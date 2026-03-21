import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Badge } from '@/components/ui'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import { ContestStatusBadge } from '@/components/features/ContestStatusBadge'
import { useContestSubmissions, useContestDetail } from '@/hooks/api/useContests'
import type { ContestSubmissionsParams } from '@/types/contest'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function ContestSubmissionsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

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
    <AppLayout
      breadcrumbs={[
        { label: 'Competencias', href: '/contests' },
        { label: contest?.name || '...', href: `/contests/${id}` },
        { label: 'Submissions' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/contests/${id}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-text flex items-center gap-2">
                <FileText className="h-6 w-6 text-brand-primary" />
                Submissions
              </h1>
              {data?.contest && (
                <p className="text-sm text-neutral-text-muted">{data.contest.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data?.contest && <ContestStatusBadge status={data.contest.status} />}
            <Select value={phase} onValueChange={(v) => { setPhase(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="competition">Competencia</SelectItem>
                <SelectItem value="postcompetition">Post-competencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
  )
}
