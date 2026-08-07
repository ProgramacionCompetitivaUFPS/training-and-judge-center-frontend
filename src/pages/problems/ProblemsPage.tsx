import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCode2, Filter, Plus, X } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge } from '@/components/ui'
import { EmptyState } from '@/components/patterns'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Pagination, PaginationContent, PaginationItem, PaginationNumbers, PaginationPrevious, PaginationNext } from '@/components/ui/Pagination'
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
import { cn } from '@/lib/utils'
import type { ProblemListParams, ProblemListItem } from '@/types/problem'

const POPULAR_TAGS = [
  'dp', 'graphs', 'arrays', 'strings', 'binary-search',
  'sorting', 'data-structures', 'bfs', 'hash-table', 'divide-and-conquer',
] as const

export function ProblemsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = user?.role === 'ADMIN' || user?.role === 'COACH'

  const [filters, setFilters] = useState<ProblemListParams>({ page: 1, limit: 20 })
  const [authorInput, setAuthorInput] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const debouncedAuthor = useDebounce(authorInput)

  const queryParams: ProblemListParams = {
    ...filters,
    author: debouncedAuthor || undefined,
    tags: selectedTag || undefined,
  }

  const { data, isLoading } = useProblems(queryParams)

  const problems = data?.problems ?? []
  const pagination = data?.pagination

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }))
  }

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
              <div className="flex items-center gap-3 rounded-lg border border-neutral-border bg-neutral-surface px-4 py-2.5">
                <span className="text-sm text-neutral-text-muted shrink-0">Filtrar:</span>
                <Input
                  placeholder="Autor (nickname)"
                  className="flex-1 min-w-0 bg-neutral-bg"
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
                />
                {canCreate && (
                  <Select
                    onValueChange={(v) => setFilters((prev) => ({ ...prev, status: v === 'ALL' ? undefined : v as 'DRAFT' | 'PUBLISHED', page: 1 }))}
                    defaultValue="ALL"
                  >
                    <SelectTrigger className="w-44 shrink-0 bg-neutral-bg"><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos los estados</SelectItem>
                      <SelectItem value="PUBLISHED">Publicado</SelectItem>
                      <SelectItem value="DRAFT">Borrador</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {canCreate && (
                  <Select
                    onValueChange={(v) => setFilters((prev) => ({ ...prev, accessibility: v === 'ALL' ? undefined : v as 'PUBLIC' | 'PRIVATE', page: 1 }))}
                    defaultValue="ALL"
                  >
                    <SelectTrigger className="w-44 shrink-0 bg-neutral-bg"><SelectValue placeholder="Acceso" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todo el acceso</SelectItem>
                      <SelectItem value="PUBLIC">Público</SelectItem>
                      <SelectItem value="PRIVATE">Privado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-neutral-text-muted">Tags:</span>
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={cn(
                      'px-3 py-1 rounded-pill text-xs font-bold transition-colors',
                      selectedTag === tag
                        ? 'bg-brand-primary text-neutral-surface'
                        : 'bg-neutral-border/50 text-neutral-text-primary hover:bg-neutral-border'
                    )}
                  >
                    {tag}
                  </button>
                ))}
                {selectedTag && (
                  <button
                    onClick={() => { setSelectedTag(null); setFilters((prev) => ({ ...prev, page: 1 })) }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-text-muted hover:text-neutral-text-primary transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results count + Content */}
        {pagination && !isLoading && problems.length > 0 && (
          <div className="flex items-center justify-between text-xs text-neutral-text-muted">
            <span>{pagination.totalCount} problemas en total</span>
            <span>Página {pagination.currentPage} de {pagination.totalPages}</span>
          </div>
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
        {pagination && pagination.totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              {pagination.currentPage > 1 && (
                <PaginationItem>
                  <PaginationPrevious onClick={() => handlePageChange(pagination.currentPage - 1)} />
                </PaginationItem>
              )}
              <PaginationNumbers
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
              {pagination.currentPage < pagination.totalPages && (
                <PaginationItem>
                  <PaginationNext onClick={() => handlePageChange(pagination.currentPage + 1)} />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
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
