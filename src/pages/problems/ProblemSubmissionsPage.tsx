import { useState } from 'react'
import { useParams } from 'react-router-dom'
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
import { useProblemDetail, useProblemStatistics } from '@/hooks/api/useProblems'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { PROGRAMMING_LANGUAGES, PATHS } from '@/lib/constants'
import { RowLink } from '@/components/ui/RowLink'
import { cn } from '@/lib/utils'
import type { ProblemSubmissionsParams, SubmissionOrigin, SubmissionStatus, SubmissionLanguage } from '@/types/submission'

const VERDICT_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACCEPTED', label: 'Aceptado' },
  { value: 'WRONG_ANSWER', label: 'Respuesta Incorrecta' },
  { value: 'TIME_LIMIT_EXCEEDED', label: 'Tiempo Límite Excedido' },
  { value: 'MEMORY_LIMIT_EXCEEDED', label: 'Memoria Límite Excedida' },
  { value: 'OUTPUT_LIMIT_EXCEEDED', label: 'Salida Límite Excedida' },
  { value: 'RUNTIME_ERROR', label: 'Error en Tiempo de Ejecución' },
  { value: 'COMPILATION_ERROR', label: 'Error de Compilación' },
  { value: 'PENDING', label: 'Pendiente' },
]

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  ...PROGRAMMING_LANGUAGES,
]

export function ProblemSubmissionsPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: problem } = useProblemDetail(slug || '')
  const { data: stats, isLoading: statsLoading, isError: statsError } = useProblemStatistics(slug || '')

  const [filters, setFilters] = useState<ProblemSubmissionsParams>({ page: 1, limit: 5 })
  const [mineOnly, setMineOnly] = useState(false)
  const hasActiveFilters = !!filters.verdict || !!filters.language || mineOnly

  const queryParams: ProblemSubmissionsParams = {
    ...filters,
    mine: mineOnly || undefined,
  }

  const { data, isLoading } = useProblemSubmissions(slug || '', queryParams)
  const submissions = data?.submissions ?? []
  const pagination = data?.pagination

  const { handlePageChange, handleLimitChange } = usePaginationHandlers(setFilters)

  // Passed to SubmissionDetailPage so its breadcrumb/"Volver" point back to this problem's
  // submissions list instead of the unrelated global "Mis Envíos" list.
  const submissionOrigin: SubmissionOrigin = {
    backTo: PATHS.problemSubmissions(slug || ''),
    backLabel: 'Envíos',
    breadcrumbPrefix: [
      { label: 'Problemas', href: '/problems' },
      { label: problem?.title ?? slug ?? '...', href: PATHS.problem(slug || '') },
    ],
  }

  const breadcrumbs = [
    { label: 'Problemas', href: '/problems' },
    { label: problem?.title ?? slug ?? '...', href: `/problems/${slug}` },
    { label: 'Envíos' },
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
              Solo mis envíos
            </label>
          </div>
        </div>

        {/* Results count */}
        {pagination && !isLoading && (
          <PaginationSummary
            total={pagination.total}
            totalLabel="envíos"
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            limit={filters.limit ?? 5}
            onLimitChange={handleLimitChange}
          />
        )}

        {/* Table */}
        {isLoading || (submissions.length === 0 && !hasActiveFilters && statsLoading) ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              icon={FileCode2}
              title="No hay envíos"
              description="Ningún envío coincide con los filtros seleccionados."
            />
          ) : statsError && !stats ? (
            // Sin estadísticas no se puede saber si hay historial dentro de competencias,
            // así que no se afirma que nadie haya enviado.
            <EmptyState
              icon={FileCode2}
              title="Sin envíos de práctica"
              description="Este problema no tiene envíos públicos fuera de competencia."
            />
          ) : stats && stats.totalSubmissions > 0 ? (
            // Esta lista excluye a propósito los envíos hechos dentro de una competencia
            // (list_problem_submissions.go: ExcludeContest) — las estadísticas de arriba sí
            // los cuentan, así que un problema puede mostrar envíos ahí y aun así salir vacío
            // aquí si todo su historial ocurrió dentro de competencias.
            <EmptyState
              icon={FileCode2}
              title="Sin envíos de práctica"
              description="Este problema no tiene envíos públicos fuera de competencia — todo su historial registrado ocurrió dentro de una o más competencias. Revísalos desde la competencia correspondiente."
            />
          ) : (
            <EmptyState
              icon={FileCode2}
              title="No hay envíos"
              description="Todavía nadie ha enviado una solución para este problema."
            />
          )
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
                      className="relative cursor-pointer"
                    >
                      <TableCell>
                        <RowLink to={PATHS.submission(sub.id)} state={submissionOrigin}>
                          <SubmissionStatusBadge status={sub.status} />
                        </RowLink>
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
                        {sub.memoryKb != null ? `${(sub.memoryKb / 1024).toFixed(1)} MiB` : '—'}
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
