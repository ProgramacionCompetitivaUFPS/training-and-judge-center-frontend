import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/Select'
import { PaginationControls, PaginationSummary } from '@/components/ui/Pagination'
import { MaterialListItem } from '@/components/features/MaterialListItem'
import { useMaterials } from '@/hooks/api/useMaterials'
import { useGroupDetail } from '@/hooks/api/useGroups'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { cn } from '@/lib/utils'
import type { MaterialListParams, MaterialStatus } from '@/types/material'

const MATERIAL_TAGS = [
  'announcement', 'algorithms', 'data-structures', 'resources',
  'dp', 'competitive-programming', 'tutorial',
] as const

export function MaterialsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isLead = user?.role === 'ADMIN' || user?.role === 'COACH'

  const { data: groupDetail } = useGroupDetail(groupId!)

  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [pinnedFilter, setPinnedFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pageQuery, setPageQuery] = useState({ page: 1, limit: 5 })
  const debouncedSearch = useDebounce(search, 300)

  const { handlePageChange, handleLimitChange } = usePaginationHandlers(setPageQuery)

  const params: MaterialListParams = {
    page: pageQuery.page,
    limit: pageQuery.limit,
    ...(debouncedSearch && { q: debouncedSearch }),
    ...(pinnedFilter !== 'all' && { pinned: pinnedFilter === 'pinned' }),
    ...(selectedTag && { tags: selectedTag }),
    ...(statusFilter !== 'all' && { status: statusFilter as MaterialStatus }),
  }

  const { data, isLoading } = useMaterials(groupId!, params)
  const materials = data?.materials ?? []
  const pagination = data?.pagination

  function handleTagClick(tag: string) {
    setSelectedTag((prev) => (prev === tag ? null : tag))
    setPageQuery((p) => ({ ...p, page: 1 }))
  }

  const breadcrumbs = [
    { label: 'Grupos', href: '/groups' },
    { label: groupDetail?.name ?? 'Grupo', href: `/groups/${groupId}` },
    { label: 'Materiales' },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-text-primary">Materiales</h1>
            <p className="text-sm text-neutral-text-muted mt-1">Recursos y anuncios del grupo</p>
          </div>
          {isLead && (
            <Button onClick={() => navigate(`/groups/${groupId}/materials/new`)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Material
            </Button>
          )}
        </div>

        {/* Search + filters inline */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
              <Input
                placeholder="Buscar materiales..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPageQuery((p) => ({ ...p, page: 1 })) }}
              />
            </div>
            <Select value={pinnedFilter} onValueChange={(v) => { setPinnedFilter(v); setPageQuery((p) => ({ ...p, page: 1 })) }}>
              <SelectTrigger className="w-36 shrink-0"><SelectValue placeholder="Fijados" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los materiales</SelectItem>
                <SelectItem value="pinned">Solo fijados</SelectItem>
                <SelectItem value="unpinned">No fijados</SelectItem>
              </SelectContent>
            </Select>
            {isLead && (
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPageQuery((p) => ({ ...p, page: 1 })) }}>
                <SelectTrigger className="w-40 shrink-0"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="PUBLISHED">Publicados</SelectItem>
                  <SelectItem value="DRAFT">Borrador</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tag chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-neutral-text-muted">Tags:</span>
            {MATERIAL_TAGS.map((tag) => (
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
          </div>
        </div>

        {/* Results count */}
        {pagination && !isLoading && (
          <PaginationSummary
            total={pagination.totalCount}
            totalLabel="materiales"
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            limit={pageQuery.limit}
            onLimitChange={handleLimitChange}
          />
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : materials.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-neutral-text-muted">No se encontraron materiales</p>
              {isLead && (
                <Button size="sm" className="mt-3" onClick={() => navigate(`/groups/${groupId}/materials/new`)}>
                  Crear primer material
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-neutral-border">
                {materials.map((material) => (
                  <MaterialListItem
                    key={material.id}
                    material={material}
                    onClick={() => navigate(`/groups/${groupId}/materials/${material.id}`)}
                    showPreview
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {pagination && (
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </AppLayout>
  )
}
