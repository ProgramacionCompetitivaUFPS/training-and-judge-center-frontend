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
import { useAuth } from '@/hooks/useAuth'
import { useProblemSubmissions } from '@/hooks/api/useSubmissions'
import { useProblemDetail, useProblemStatistics } from '@/hooks/api/useProblems'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { PROGRAMMING_LANGUAGES, PATHS } from '@/lib/constants'
import { RowLink } from '@/components/ui/RowLink'
import { LinkTableRow } from '@/components/ui/LinkTableRow'
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

interface FilterPillsProps {
  label: string
  options: { value: string; label: string }[]
  /** The active option's value, or undefined when no filter is applied ("Todos"). */
  selected: string | undefined
  /** Called with the chosen value, or undefined for "Todos". */
  onSelect: (value: string | undefined) => void
}

function FilterPills({ label, options, selected, onSelect }: Readonly<FilterPillsProps>) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold text-neutral-text-muted mr-1">{label}</span>
      {options.map((opt) => {
        const isAll = opt.value === 'ALL'
        const isActive = isAll ? !selected : selected === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(isAll ? undefined : opt.value)}
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
  )
}

interface NoSubmissionsStateProps {
  hasActiveFilters: boolean
  /** Without statistics there is no way to know whether the history lives inside contests. */
  statsUnavailable: boolean
  /** The statistics count submissions, but this list leaves out those made inside a contest. */
  hasHistoryInContests: boolean
}

function NoSubmissionsState({ hasActiveFilters, statsUnavailable, hasHistoryInContests }: Readonly<NoSubmissionsStateProps>) {
  if (hasActiveFilters) {
    return <EmptyState icon={FileCode2} title="No hay envíos" description="Ningún envío coincide con los filtros seleccionados." />
  }
  if (statsUnavailable) {
    // Sin estadísticas no se puede saber si hay historial dentro de competencias,
    // así que no se afirma que nadie haya enviado. Si falla el detalle del problema, la
    // consulta de estadísticas queda deshabilitada (no entra en error), de ahí problemError.
    return (
      <EmptyState
        icon={FileCode2}
        title="Sin envíos de práctica"
        description="Este problema no tiene envíos públicos fuera de competencia."
      />
    )
  }
  if (hasHistoryInContests) {
    // Esta lista excluye a propósito los envíos hechos dentro de una competencia
    // (list_problem_submissions.go: ExcludeContest) — las estadísticas de arriba sí
    // los cuentan, así que un problema puede mostrar envíos ahí y aun así salir vacío
    // aquí si todo su historial ocurrió dentro de competencias.
    return (
      <EmptyState
        icon={FileCode2}
        title="Sin envíos de práctica"
        description="Este problema no tiene envíos públicos fuera de competencia — todo su historial registrado ocurrió dentro de una o más competencias. Revísalos desde la competencia correspondiente."
      />
    )
  }
  return <EmptyState icon={FileCode2} title="No hay envíos" description="Todavía nadie ha enviado una solución para este problema." />
}

type SubmissionItem = NonNullable<ReturnType<typeof useProblemSubmissions>['data']>['submissions'][number]

interface SubmissionsTableProps {
  submissions: SubmissionItem[]
  currentUserId: string | undefined
  origin: SubmissionOrigin
}

function SubmissionsTable({ submissions, currentUserId, origin }: Readonly<SubmissionsTableProps>) {
  return (
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
              <LinkTableRow key={sub.id} to={PATHS.submission(sub.id)} state={origin}>
                <TableCell>
                  <RowLink to={PATHS.submission(sub.id)} state={origin} overlay={false}>
                    <div className="flex items-center gap-2">
                      <SubmissionStatusBadge status={sub.status} />
                      {sub.submittedBy.id === currentUserId && sub.visibility === 'PRIVATE' && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-pill bg-neutral-border text-neutral-text-primary">
                          Privado
                        </span>
                      )}
                    </div>
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
              </LinkTableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

interface SubmissionsContentProps extends NoSubmissionsStateProps, SubmissionsTableProps {
  isLoading: boolean
  /** The problem or its statistics are still loading, so an empty list cannot be explained yet. */
  waitingForContext: boolean
}

function SubmissionsContent({ isLoading, waitingForContext, submissions, currentUserId, origin, ...emptyState }: Readonly<SubmissionsContentProps>) {
  const isEmpty = submissions.length === 0
  if (isLoading || (isEmpty && !emptyState.hasActiveFilters && waitingForContext)) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }
  if (isEmpty) return <NoSubmissionsState {...emptyState} />
  return <SubmissionsTable submissions={submissions} currentUserId={currentUserId} origin={origin} />
}

export function ProblemSubmissionsPage() {
  const { slug } = useParams<{ slug: string }>()
  const slugValue = slug ?? ''

  const { user } = useAuth()
  const { data: problem, isLoading: problemLoading, isError: problemError } = useProblemDetail(slugValue)
  const { data: stats, isLoading: statsLoading, isError: statsError } = useProblemStatistics(
    slugValue,
    problem?.status === 'PUBLISHED',
  )

  const [filters, setFilters] = useState<ProblemSubmissionsParams>({ page: 1, limit: 5 })
  const [mineOnly, setMineOnly] = useState(false)
  const hasActiveFilters = !!filters.verdict || !!filters.language || mineOnly

  const queryParams: ProblemSubmissionsParams = {
    ...filters,
    mine: mineOnly || undefined,
  }

  const { data, isLoading } = useProblemSubmissions(slugValue, queryParams)
  const submissions = data?.submissions ?? []
  const pagination = data?.pagination

  const { handlePageChange, handleLimitChange } = usePaginationHandlers(setFilters)

  // Passed to SubmissionDetailPage so its breadcrumb/"Volver" point back to this problem's
  // submissions list instead of the unrelated global "Mis Envíos" list.
  const submissionOrigin: SubmissionOrigin = {
    backTo: PATHS.problemSubmissions(slugValue),
    backLabel: 'Envíos',
    breadcrumbPrefix: [
      { label: 'Problemas', href: '/problems' },
      { label: problem?.title ?? slug ?? '...', href: PATHS.problem(slugValue) },
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
          <FilterPills
            label="Veredicto"
            options={VERDICT_OPTIONS}
            selected={filters.verdict}
            onSelect={(value) => setFilters((prev) => ({ ...prev, verdict: value as SubmissionStatus | undefined, page: 1 }))}
          />
          <FilterPills
            label="Lenguaje"
            options={LANGUAGE_OPTIONS}
            selected={filters.language}
            onSelect={(value) => setFilters((prev) => ({ ...prev, language: value as SubmissionLanguage | undefined, page: 1 }))}
          />
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
        <SubmissionsContent
          isLoading={isLoading}
          waitingForContext={problemLoading || statsLoading}
          submissions={submissions}
          hasActiveFilters={hasActiveFilters}
          statsUnavailable={(statsError || problemError) && !stats}
          hasHistoryInContests={!!stats && stats.totalSubmissions > 0}
          currentUserId={user?.id}
          origin={submissionOrigin}
        />

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
