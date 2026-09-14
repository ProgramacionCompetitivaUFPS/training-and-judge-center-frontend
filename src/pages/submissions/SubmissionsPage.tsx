import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCode2, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { DataTable, EmptyState } from '@/components/patterns'
import type { Column } from '@/components/patterns/DataTable'
import { Input } from '@/components/ui/Input'
import { PaginationControls, PaginationSummary } from '@/components/ui/Pagination'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import { useMySubmissions } from '@/hooks/api/useSubmissions'
import { useDebounce } from '@/hooks/useDebounce'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { PROGRAMMING_LANGUAGES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { MySubmissionsParams, SubmissionListItem, SubmissionStatus, SubmissionLanguage } from '@/types/submission'

const VERDICT_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'WRONG_ANSWER', label: 'Wrong Answer' },
  { value: 'TIME_LIMIT_EXCEEDED', label: 'Time Limit Exceeded' },
  { value: 'MEMORY_LIMIT_EXCEEDED', label: 'Memory Limit Exceeded' },
  { value: 'RUNTIME_EXCEPTION', label: 'Runtime Error' },
  { value: 'COMPILATION_ERROR', label: 'Compilation Error' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RUNNING', label: 'Running' },
]

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  ...PROGRAMMING_LANGUAGES,
]

const columns: Column<SubmissionListItem>[] = [
  {
    key: 'status',
    label: 'Veredicto',
    width: '160px',
    render: (sub) => <SubmissionStatusBadge status={sub.status} />,
  },
  {
    key: 'problem',
    label: 'Problema',
    render: (sub) => (
      <div>
        <span className="font-medium text-neutral-text-primary">{sub.problem.title}</span>
        <span className="block text-xs text-neutral-text-muted font-mono">{sub.problem.slug}</span>
      </div>
    ),
  },
  {
    key: 'language',
    label: 'Lenguaje',
    width: '120px',
    render: (sub) => {
      const label = PROGRAMMING_LANGUAGES.find((l) => l.value === sub.language)?.label ?? sub.language
      return <span className="text-sm font-mono text-neutral-text-muted">{label}</span>
    },
  },
  {
    key: 'executionTime',
    label: 'Tiempo',
    width: '100px',
    align: 'right',
    render: (sub) => (
      <span className="text-sm text-neutral-text-muted">
        {sub.executionTime != null ? `${sub.executionTime} ms` : '—'}
      </span>
    ),
  },
  {
    key: 'memoryUsed',
    label: 'Memoria',
    width: '100px',
    align: 'right',
    render: (sub) => (
      <span className="text-sm text-neutral-text-muted">
        {sub.memoryUsed != null ? `${sub.memoryUsed} MiB` : '—'}
      </span>
    ),
  },
  {
    key: 'submittedAt',
    label: 'Fecha',
    width: '160px',
    align: 'right',
    render: (sub) => (
      <span className="text-xs text-neutral-text-muted">
        {new Date(sub.submittedAt).toLocaleString('es')}
      </span>
    ),
  },
]

export function SubmissionsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<MySubmissionsParams>({ page: 1, limit: 5 })
  const [problemInput, setProblemInput] = useState('')
  const debouncedProblem = useDebounce(problemInput)

  const queryParams: MySubmissionsParams = {
    ...filters,
    problemSlug: debouncedProblem || undefined,
  }

  const { data, isLoading } = useMySubmissions(queryParams)
  const submissions = data?.submissions ?? []
  const pagination = data?.pagination

  const { handlePageChange, handleLimitChange } = usePaginationHandlers(setFilters)

  return (
    <AppLayout breadcrumbs={[{ label: 'Mis Submissions' }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-text-primary">Mis Submissions</h1>
          <p className="text-sm text-neutral-text-muted mt-1">
            Historial de todas tus soluciones enviadas
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
            <Input
              variant="ghost"
              placeholder="Filtrar por problema (slug)..."
              className="pl-7"
              value={problemInput}
              onChange={(e) => setProblemInput(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-neutral-text-muted mr-1">Fecha</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-text-muted">Desde</span>
                <Input
                  type="date"
                  variant="ghost"
                  containerClassName="w-[170px]"
                  className={cn(
                    'pr-2 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-40 [&::-webkit-calendar-picker-indicator]:hover:opacity-80',
                    !filters.from && 'text-neutral-text-muted'
                  )}
                  aria-label="Desde"
                  value={filters.from ?? ''}
                  onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value || undefined, page: 1 }))}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-text-muted">Hasta</span>
                <Input
                  type="date"
                  variant="ghost"
                  containerClassName="w-[170px]"
                  className={cn(
                    'pr-2 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-40 [&::-webkit-calendar-picker-indicator]:hover:opacity-80',
                    !filters.to && 'text-neutral-text-muted'
                  )}
                  aria-label="Hasta"
                  value={filters.to ?? ''}
                  onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value || undefined, page: 1 }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-neutral-text-muted mr-1">Veredicto</span>
              {VERDICT_OPTIONS.map((opt) => {
                const isActive = opt.value === 'ALL' ? !filters.verdict : filters.verdict === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        verdict: opt.value === 'ALL' ? undefined : (opt.value as SubmissionStatus),
                        page: 1,
                      }))
                    }
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
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        language: opt.value === 'ALL' ? undefined : (opt.value as SubmissionLanguage),
                        page: 1,
                      }))
                    }
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
        {!isLoading && submissions.length === 0 ? (
          <EmptyState
            icon={FileCode2}
            title="No hay submissions"
            description="Aún no has enviado ninguna solución. Ve a un problema y envía tu código."
          />
        ) : (
          <DataTable<SubmissionListItem>
            columns={columns}
            data={submissions}
            isLoading={isLoading}
            onRowClick={(sub) => navigate(`/submissions/${sub.id}`)}
            emptyMessage="No hay submissions con los filtros seleccionados"
          />
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
