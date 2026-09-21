import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileCode2 } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/Table'
import { PaginationControls, PaginationSummary } from '@/components/ui/Pagination'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import { EmptyState } from '@/components/patterns'
import { useProblemSubmissions } from '@/hooks/api/useSubmissions'
import { useProblemDetail } from '@/hooks/api/useProblems'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { PROGRAMMING_LANGUAGES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ProblemSubmissionsParams, SubmissionStatus, SubmissionLanguage } from '@/types/submission'

const VERDICT_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'WRONG_ANSWER', label: 'Wrong Answer' },
  { value: 'TIME_LIMIT_EXCEEDED', label: 'Time Limit Exceeded' },
  { value: 'RUNTIME_EXCEPTION', label: 'Runtime Error' },
  { value: 'COMPILATION_ERROR', label: 'Compilation Error' },
  { value: 'PENDING', label: 'Pending' },
]

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  ...PROGRAMMING_LANGUAGES,
]

export function ProblemSubmissionsPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const { data: problem } = useProblemDetail(slug || '')

  const [filters, setFilters] = useState<ProblemSubmissionsParams>({ page: 1, limit: 5 })
  const [mineOnly, setMineOnly] = useState(false)

  const queryParams: ProblemSubmissionsParams = {
    ...filters,
    mine: mineOnly || undefined,
  }

  const { data, isLoading } = useProblemSubmissions(slug || '', queryParams)
  const submissions = data?.submissions ?? []
  const pagination = data?.pagination

  const { handlePageChange, handleLimitChange } = usePaginationHandlers(setFilters)

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
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-neutral-text-muted mr-1">Veredicto</span>
            {VERDICT_OPTIONS.map((opt) => {
              const isActive = opt.value === 'ALL' ? !filters.verdict : filters.verdict === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilters((prev) => ({
                    ...prev,
                    verdict: opt.value === 'ALL' ? undefined : (opt.value as SubmissionStatus),
                    page: 1,
                  }))}
                  className={cn(
                    'px-3 py-1 rounded-pill text-xs font-bold transition-colors',
                    isActive
                      ? 'bg-brand-primary text-neutral-surface'
                      : 'bg-neutral-border/50 text-neutral-text-primary hover:bg-neutral-border'
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-neutral-text-muted mr-1">Lenguaje</span>
            {LANGUAGE_OPTIONS.map((opt) => {
              const isActive = opt.value === 'ALL' ? !filters.language : filters.language === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilters((prev) => ({
                    ...prev,
                    language: opt.value === 'ALL' ? undefined : (opt.value as SubmissionLanguage),
                    page: 1,
                  }))}
                  className={cn(
                    'px-3 py-1 rounded-pill text-xs font-bold transition-colors',
                    isActive
                      ? 'bg-brand-primary text-neutral-surface'
                      : 'bg-neutral-border/50 text-neutral-text-primary hover:bg-neutral-border'
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="mineOnly"
              checked={mineOnly}
              onCheckedChange={(checked) => { setMineOnly(checked === true); setFilters((prev) => ({ ...prev, page: 1 })) }}
            />
            <label htmlFor="mineOnly" className="text-sm text-neutral-text-primary whitespace-nowrap cursor-pointer">
              Solo mis submissions
            </label>
          </div>
        </div>

        {/* Results count */}
        {pagination && !isLoading && (
          <PaginationSummary
            total={pagination.total}
            totalLabel="submissions"
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            limit={filters.limit ?? 5}
            onLimitChange={handleLimitChange}
          />
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
        {pagination && (
          <PaginationControls
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </AppLayout>
  )
}
