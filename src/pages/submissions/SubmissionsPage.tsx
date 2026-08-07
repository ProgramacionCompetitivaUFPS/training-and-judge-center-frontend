import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCode2, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { DataTable, EmptyState } from '@/components/patterns'
import type { Column } from '@/components/patterns/DataTable'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { PaginationControls, PaginationSummary } from '@/components/ui/Pagination'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import { useMySubmissions } from '@/hooks/api/useSubmissions'
import { useDebounce } from '@/hooks/useDebounce'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { PROGRAMMING_LANGUAGES } from '@/lib/constants'
import type { MySubmissionsParams, SubmissionListItem, SubmissionStatus, SubmissionLanguage } from '@/types/submission'

const VERDICT_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Todos los veredictos' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'WRONG_ANSWER', label: 'Wrong Answer' },
  { value: 'TIME_LIMIT_EXCEEDED', label: 'Time Limit Exceeded' },
  { value: 'MEMORY_LIMIT_EXCEEDED', label: 'Memory Limit Exceeded' },
  { value: 'RUNTIME_EXCEPTION', label: 'Runtime Error' },
  { value: 'COMPILATION_ERROR', label: 'Compilation Error' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RUNNING', label: 'Running' },
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
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
            <Input
              placeholder="Filtrar por problema (slug)..."
              className="pl-9"
              value={problemInput}
              onChange={(e) => setProblemInput(e.target.value)}
            />
          </div>
          <Select
            onValueChange={(v) =>
              setFilters((prev) => ({
                ...prev,
                verdict: v === 'ALL' ? undefined : (v as SubmissionStatus),
                page: 1,
              }))
            }
            defaultValue="ALL"
          >
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Veredicto" /></SelectTrigger>
            <SelectContent>
              {VERDICT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(v) =>
              setFilters((prev) => ({
                ...prev,
                language: v === 'ALL' ? undefined : (v as SubmissionLanguage),
                page: 1,
              }))
            }
            defaultValue="ALL"
          >
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Lenguaje" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los lenguajes</SelectItem>
              {PROGRAMMING_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
