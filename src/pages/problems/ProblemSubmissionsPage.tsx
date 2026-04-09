import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileCode2 } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/Table'
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationPrevious, PaginationNext,
} from '@/components/ui/Pagination'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import { EmptyState } from '@/components/patterns'
import { useProblemSubmissions } from '@/hooks/api/useSubmissions'
import { useProblemDetail } from '@/hooks/api/useProblems'
import { PROGRAMMING_LANGUAGES } from '@/lib/constants'
import type { ProblemSubmissionsParams, SubmissionStatus, SubmissionLanguage } from '@/types/submission'

const VERDICT_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Todos los veredictos' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'WRONG_ANSWER', label: 'Wrong Answer' },
  { value: 'TIME_LIMIT_EXCEEDED', label: 'Time Limit Exceeded' },
  { value: 'RUNTIME_EXCEPTION', label: 'Runtime Error' },
  { value: 'COMPILATION_ERROR', label: 'Compilation Error' },
  { value: 'PENDING', label: 'Pending' },
]

export function ProblemSubmissionsPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const { data: problem } = useProblemDetail(slug || '')

  const [filters, setFilters] = useState<ProblemSubmissionsParams>({ page: 1, limit: 20 })
  const [mineOnly, setMineOnly] = useState(false)

  const queryParams: ProblemSubmissionsParams = {
    ...filters,
    mine: mineOnly || undefined,
  }

  const { data, isLoading } = useProblemSubmissions(slug || '', queryParams)
  const submissions = data?.submissions ?? []
  const pagination = data?.pagination

  const breadcrumbs = [
    { label: 'Problemas', href: '/problems' },
    { label: problem?.title ?? slug ?? '...', href: `/problems/${slug}` },
    { label: 'Submissions' },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-text-primary">
            Submissions — {problem?.title ?? slug}
          </h1>
          <p className="text-sm text-neutral-text-muted mt-1">
            Todas las soluciones enviadas para este problema
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            onValueChange={(v) => setFilters((prev) => ({
              ...prev,
              verdict: v === 'ALL' ? undefined : (v as SubmissionStatus),
              page: 1,
            }))}
            defaultValue="ALL"
          >
            <SelectTrigger className="w-52 shrink-0"><SelectValue placeholder="Veredicto" /></SelectTrigger>
            <SelectContent>
              {VERDICT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(v) => setFilters((prev) => ({
              ...prev,
              language: v === 'ALL' ? undefined : (v as SubmissionLanguage),
              page: 1,
            }))}
            defaultValue="ALL"
          >
            <SelectTrigger className="w-44 shrink-0"><SelectValue placeholder="Lenguaje" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los lenguajes</SelectItem>
              {PROGRAMMING_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => { setMineOnly((prev) => !prev); setFilters((prev) => ({ ...prev, page: 1 })) }}
            className={`px-4 py-2 rounded-pill text-xs font-bold transition-colors ${
              mineOnly
                ? 'bg-brand-primary text-neutral-surface'
                : 'bg-neutral-border/50 text-neutral-text-primary hover:bg-neutral-border'
            }`}
          >
            Solo mis submissions
          </button>
        </div>

        {/* Results count */}
        {pagination && !isLoading && submissions.length > 0 && (
          <div className="flex items-center justify-between text-xs text-neutral-text-muted">
            <span>{pagination.total} submissions</span>
            <span>Página {pagination.page} de {pagination.totalPages}</span>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={FileCode2}
            title="No hay submissions"
            description="Aún no se han enviado soluciones para este problema con los filtros seleccionados."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veredicto</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Lenguaje</TableHead>
                    <TableHead className="text-right">Tiempo</TableHead>
                    <TableHead className="text-right">Memoria</TableHead>
                    <TableHead className="text-right">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow
                      key={sub.id}
                      className="cursor-pointer hover:bg-neutral-bg/50"
                      onClick={() => navigate(`/submissions/${sub.id}`)}
                    >
                      <TableCell>
                        <SubmissionStatusBadge status={sub.status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-neutral-text-muted">@{sub.submittedBy.nickname}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-neutral-text-muted">
                          {PROGRAMMING_LANGUAGES.find((l) => l.value === sub.language)?.label ?? sub.language}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-neutral-text-muted">
                        {sub.executionTime != null ? `${sub.executionTime} ms` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm text-neutral-text-muted">
                        {sub.memoryUsed != null ? `${sub.memoryUsed} MiB` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs text-neutral-text-muted">
                        {new Date(sub.submittedAt).toLocaleString('es')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              {pagination.hasPrevPage && (
                <PaginationItem>
                  <PaginationPrevious onClick={() => setFilters((prev) => ({ ...prev, page: pagination.page - 1 }))} />
                </PaginationItem>
              )}
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink isActive={p === pagination.page} onClick={() => setFilters((prev) => ({ ...prev, page: p }))}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {pagination.hasNextPage && (
                <PaginationItem>
                  <PaginationNext onClick={() => setFilters((prev) => ({ ...prev, page: pagination.page + 1 }))} />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </AppLayout>
  )
}
