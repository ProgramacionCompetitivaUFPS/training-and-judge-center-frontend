import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCode2, Plus, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Badge } from '@/components/ui'
import { EmptyState } from '@/components/patterns'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card, CardContent } from '@/components/ui/Card'
import { useProblems } from '@/hooks/api/useProblems'
import { useAuth } from '@/hooks/useAuth'
import type { ProblemListParams, ProblemListItem } from '@/types/problem'


export function ProblemsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = user?.role === 'ADMIN' || user?.role === 'COACH'

  const [filters, setFilters] = useState<ProblemListParams>({ page: 1, limit: 20 })
  const { data, isLoading } = useProblems(filters)

  const problems = data?.problems ?? []
  const pagination = data?.pagination

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }))
  }

  const breadcrumbs = [{ label: 'Problemas' }]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-text">Problemas</h1>
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

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
            <Input
              placeholder="Filtrar por autor (nickname)..."
              className="pl-9"
              onChange={(e) => setFilters((prev) => ({ ...prev, author: e.target.value || undefined, page: 1 }))}
            />
          </div>
          {canCreate && (
            <Select
              onValueChange={(v) => setFilters((prev) => ({ ...prev, status: v === 'ALL' ? undefined : v as 'DRAFT' | 'PUBLISHED', page: 1 }))}
              defaultValue="ALL"
            >
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
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
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Acceso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todo el acceso</SelectItem>
                <SelectItem value="PUBLIC">Público</SelectItem>
                <SelectItem value="PRIVATE">Privado</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
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
          <div className="space-y-3">
            {problems.map((problem) => (
              <ProblemRow
                key={problem.slug}
                problem={problem}
                onClick={() => navigate(`/problems/${problem.slug}`)}
                showManagementBadges={canCreate}
              />
            ))}
          </div>
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
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={page === pagination.currentPage}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
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

// === Sub-component ===

function ProblemRow({ problem, onClick, showManagementBadges }: { problem: ProblemListItem; onClick: () => void; showManagementBadges: boolean }) {
  return (
    <Card
      className="cursor-pointer hover:border-brand-primary/30 transition-colors"
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between py-4 px-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-neutral-text truncate">{problem.title}</span>
            {showManagementBadges && (
              <>
                <Badge variant={problem.status === 'PUBLISHED' ? 'success' : 'default'}>
                  {problem.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                </Badge>
                <Badge variant={problem.accessibility === 'PUBLIC' ? 'primary' : 'outline'}>
                  {problem.accessibility === 'PUBLIC' ? 'Público' : 'Privado'}
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-text-muted">
            <span>{problem.author.name}</span>
            <span>·</span>
            <span className="font-mono text-xs">{problem.slug}</span>
            {problem.tags.length > 0 && (
              <>
                <span>·</span>
                <span>{problem.tags.slice(0, 3).join(', ')}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-xs text-neutral-text-muted">
          {new Date(problem.createdAt).toLocaleDateString('es')}
        </div>
      </CardContent>
    </Card>
  )
}
