import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCode2, Filter, Plus, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge } from '@/components/ui'
import { EmptyState } from '@/components/patterns'
import { TagFilterChips } from '@/components/features/TagFilterChips'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PaginationControls, PaginationSummary } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Card, CardContent } from '@/components/ui/Card'
import { useProblems } from '@/hooks/api/useProblems'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { cn } from '@/lib/utils'
import type { ProblemListParams, ProblemListItem } from '@/types/problem'

const POPULAR_TAGS = [
  'dp', 'graphs', 'arrays', 'strings', 'binary-search',
  'sorting', 'data-structures', 'bfs', 'hash-table', 'divide-and-conquer',
] as const

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PUBLISHED', label: 'Publicado' },
  { value: 'DRAFT', label: 'Borrador' },
]

const ACCESS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PUBLIC', label: 'Público' },
  { value: 'PRIVATE', label: 'Privado' },
]

export function ProblemsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = user?.role === 'ADMIN' || user?.role === 'COACH'

  const [filters, setFilters] = useState<ProblemListParams>({ page: 1, limit: 5 })
  const [searchInput, setSearchInput] = useState('')
  const [authorInput, setAuthorInput] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const debouncedSearch = useDebounce(searchInput)
  const debouncedAuthor = useDebounce(authorInput)

  const queryParams: ProblemListParams = {
    ...filters,
    search: debouncedSearch || undefined,
    author: debouncedAuthor || undefined,
    tags: selectedTag || undefined,
  }

  const { data, isLoading } = useProblems(queryParams)

  const problems = data?.problems ?? []
  const pagination = data?.pagination

  const { handlePageChange, handleLimitChange } = usePaginationHandlers(setFilters)

  function handleTagClick(tag: string) {
    setSelectedTag((prev) => (prev === tag ? null : tag))
    setFilters((prev) => ({ ...prev, page: 1 }))
  }

  const breadcrumbs = [{ label: 'Problemas' }]

  const activeFiltersCount =
    (debouncedAuthor ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.accessibility ? 1 : 0) +
    (selectedTag ? 1 : 0)

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-text-primary">Problemas</h1>
            <p className="text-sm text-neutral-text-muted mt-1">
              Explora y gestiona problemas de programación
            </p>
          </div>
          {canCreate && (
            <Button variant="primary" onClick={() => navigate('/problems/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Crear problema
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
          <Input
            placeholder="Buscar problemas por título..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setFilters((prev) => ({ ...prev, page: 1 })) }}
          />
        </div>

        {/* Collapsible Filters */}
        <div className="space-y-3">
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-medium text-neutral-text-primary hover:text-brand-primary transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-pill bg-brand-primary text-neutral-surface">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Filter Bar */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 max-w-sm">
                  <span className="text-sm text-neutral-text-muted shrink-0">Filtrar:</span>
                  <Input
                    placeholder="Autor (nickname)"
                    className="flex-1 min-w-0"
                    value={authorInput}
                    onChange={(e) => setAuthorInput(e.target.value)}
                  />
                </div>
                {canCreate && (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-neutral-text-muted mr-1">Estado</span>
                      {STATUS_OPTIONS.map((opt) => {
                        const isActive = opt.value === 'ALL' ? !filters.status : filters.status === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                status: opt.value === 'ALL' ? undefined : (opt.value as 'DRAFT' | 'PUBLISHED'),
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
                      <span className="text-xs font-semibold text-neutral-text-muted mr-1">Acceso</span>
                      {ACCESS_OPTIONS.map((opt) => {
                        const isActive = opt.value === 'ALL' ? !filters.accessibility : filters.accessibility === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                accessibility: opt.value === 'ALL' ? undefined : (opt.value as 'PUBLIC' | 'PRIVATE'),
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
                )}
              </div>

              <TagFilterChips
                tags={POPULAR_TAGS}
                selectedTag={selectedTag}
                onTagClick={handleTagClick}
                onClear={() => { setSelectedTag(null); setFilters((prev) => ({ ...prev, page: 1 })) }}
              />
            </div>
          )}
        </div>

        {/* Results count + Content */}
        {pagination && !isLoading && (
          <PaginationSummary
            total={pagination.total}
            totalLabel="problemas en total"
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            limit={filters.limit ?? 5}
            onLimitChange={handleLimitChange}
          />
        )}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : problems.length === 0 ? (
          <EmptyState
            icon={FileCode2}
            title="No hay problemas"
            description={canCreate ? 'Crea tu primer problema para empezar' : 'No se encontraron problemas con los filtros actuales'}
            action={canCreate ? { label: 'Crear problema', onClick: () => navigate('/problems/new'), icon: Plus } : undefined}
          />
        ) : (
          <ProblemsTable
            problems={problems}
            showManagementColumns={canCreate}
            onRowClick={(p) => navigate(`/problems/${p.slug}`)}
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

// === Sub-components ===

interface ProblemsTableProps {
  problems: ProblemListItem[]
  showManagementColumns: boolean
  onRowClick: (problem: ProblemListItem) => void
}

function ProblemsTable({ problems, showManagementColumns, onRowClick }: ProblemsTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Autor</TableHead>
              {showManagementColumns && <TableHead>Estado</TableHead>}
              {showManagementColumns && <TableHead>Acceso</TableHead>}
              <TableHead className="text-right">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {problems.map((problem) => (
              <TableRow
                key={problem.slug}
                className="cursor-pointer hover:bg-neutral-bg/50"
                onClick={() => onRowClick(problem)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-neutral-text-primary">{problem.title}</span>
                    <span className="text-xs font-mono text-neutral-text-muted">{problem.slug}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {problem.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="default" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                    {problem.tags.length > 3 && (
                      <span className="text-[10px] text-neutral-text-muted font-medium">
                        +{problem.tags.length - 3}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{problem.author.name}</span>
                </TableCell>
                {showManagementColumns && (
                  <TableCell>
                    <Badge variant={problem.status === 'PUBLISHED' ? 'success' : 'default'}>
                      {problem.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                    </Badge>
                  </TableCell>
                )}
                {showManagementColumns && (
                  <TableCell>
                    <Badge variant={problem.accessibility === 'PUBLIC' ? 'primary' : 'outline'}>
                      {problem.accessibility === 'PUBLIC' ? 'Público' : 'Privado'}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="text-right text-xs text-neutral-text-muted">
                  {new Date(problem.createdAt).toLocaleDateString('es')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
