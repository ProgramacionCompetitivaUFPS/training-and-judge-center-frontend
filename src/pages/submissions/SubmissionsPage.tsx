import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCode2, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge } from '@/components/ui'
import { EmptyState } from '@/components/patterns'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationPrevious, PaginationNext,
} from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card, CardContent } from '@/components/ui/Card'
import { SubmissionStatusBadge } from '@/components/features/SubmissionStatusBadge'
import { useMySubmissions } from '@/hooks/api/useSubmissions'
import { useDebounce } from '@/hooks/useDebounce'
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

export function SubmissionsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<MySubmissionsParams>({ page: 1, limit: 20 })
  const [problemInput, setProblemInput] = useState('')
  const debouncedProblem = useDebounce(problemInput)

  const queryParams: MySubmissionsParams = {
    ...filters,
    problemSlug: debouncedProblem || undefined,
  }

  const { data, isLoading } = useMySubmissions(queryParams)
  const submissions = data?.submissions ?? []
  const pagination = data?.pagination

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }))
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Mis Submissions' }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-text-primary">Mis Submissions</h1>
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
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Veredicto" /></SelectTrigger>
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
              <SelectItem value="ALL">Todos</SelectItem>
              {PROGRAMMING_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={FileCode2}
            title="No hay submissions"
            description="Aún no has enviado ninguna solución. Ve a un problema y envía tu código."
          />
        ) : (
          <div className="space-y-2">
            {submissions.map((sub) => (
              <SubmissionRow
                key={sub.id}
                submission={sub}
                onClick={() => navigate(`/submissions/${sub.id}`)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              {pagination.hasPrevPage && (
                <PaginationItem>
                  <PaginationPrevious onClick={() => handlePageChange(pagination.page - 1)} />
                </PaginationItem>
              )}
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={page === pagination.page}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {pagination.hasNextPage && (
                <PaginationItem>
                  <PaginationNext onClick={() => handlePageChange(pagination.page + 1)} />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </AppLayout>
  )
}

// === Sub-component ===

function SubmissionRow({ submission, onClick }: { submission: SubmissionListItem; onClick: () => void }) {
  const langLabel = PROGRAMMING_LANGUAGES.find((l) => l.value === submission.language)?.label ?? submission.language

  return (
    <Card className="cursor-pointer hover:border-brand-primary/30 transition-colors" onClick={onClick}>
      <CardContent className="flex items-center justify-between py-3 px-5">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <SubmissionStatusBadge status={submission.status} />
          <div className="min-w-0">
            <span className="font-medium text-neutral-text-primary truncate block">
              {submission.problem.title}
            </span>
            <span className="text-xs text-neutral-text-muted font-mono">{submission.problem.slug}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-text-muted shrink-0">
          <Badge variant="outline">{langLabel}</Badge>
          {submission.executionTime != null && (
            <span>{submission.executionTime} ms</span>
          )}
          {submission.memoryUsed != null && (
            <span>{submission.memoryUsed} MiB</span>
          )}
          <span className="text-xs">
            {new Date(submission.submittedAt).toLocaleString('es')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
