import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { EntityListPage } from '@/components/patterns'
import { SearchAndFilter } from '@/components/patterns/SearchAndFilter'
import { Card } from '@/components/ui/Card'
import { MaterialListItem } from '@/components/features/MaterialListItem'
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/Select'
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationPrevious, PaginationNext,
} from '@/components/ui/Pagination'
import { useMaterials } from '@/hooks/api/useMaterials'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import type { Material, MaterialListParams } from '@/types/material'

export function MaterialsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isLead = user?.role === 'ADMIN' || user?.role === 'COACH'

  const [search, setSearch] = useState('')
  const [pinnedFilter, setPinnedFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  const params: MaterialListParams = {
    page,
    limit: 12,
    ...(debouncedSearch && { q: debouncedSearch }),
    ...(pinnedFilter !== 'all' && { pinned: pinnedFilter === 'pinned' }),
    ...(tagFilter !== 'all' && { tags: tagFilter }),
  }

  const { data, isLoading } = useMaterials(groupId!, params)
  const materials = data?.materials ?? []
  const pagination = data?.pagination

  const activeFilters = [pinnedFilter, tagFilter].filter((f) => f !== 'all').length

  const searchComponent = (
    <SearchAndFilter
      searchValue={search}
      onSearchChange={(v) => { setSearch(v); setPage(1) }}
      searchPlaceholder="Buscar materiales..."
      activeFiltersCount={activeFilters}
      onClearFilters={() => { setPinnedFilter('all'); setTagFilter('all'); setPage(1) }}
    />
  )

  const filtersComponent = (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-border bg-neutral-surface px-4 py-2.5">
      <span className="text-sm text-neutral-text-muted shrink-0">Filtrar:</span>
      <Select value={pinnedFilter} onValueChange={(v) => { setPinnedFilter(v); setPage(1) }}>
        <SelectTrigger className="w-48 bg-neutral-bg">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="pinned">Fijados</SelectItem>
          <SelectItem value="unpinned">No fijados</SelectItem>
        </SelectContent>
      </Select>
      <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setPage(1) }}>
        <SelectTrigger className="w-56 bg-neutral-bg">
          <SelectValue placeholder="Todos los tags" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tags</SelectItem>
          <SelectItem value="announcement">announcement</SelectItem>
          <SelectItem value="algorithms">algorithms</SelectItem>
          <SelectItem value="data-structures">data-structures</SelectItem>
          <SelectItem value="resources">resources</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  const renderItem = (material: Material) => (
    <Card
      key={material.id}
      className="cursor-pointer hover:shadow-elevation-2 transition-shadow"
    >
      <MaterialListItem
        material={material}
        onClick={() => navigate(`/groups/${groupId}/materials/${material.id}`)}
        showPreview
      />
    </Card>
  )

  const paginationComponent = pagination && pagination.totalPages > 1 ? (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} />
        </PaginationItem>
        {Array.from({ length: pagination.totalPages }, (_, i) => (
          <PaginationItem key={i + 1}>
            <PaginationLink isActive={page === i + 1} onClick={() => setPage(i + 1)}>
              {i + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ) : null

  return (
    <EntityListPage<Material>
      title="Materiales"
      description="Recursos y anuncios del grupo"
      breadcrumbs={[
        { label: 'Grupos', href: '/groups' },
        { label: 'Grupo', href: `/groups/${groupId}` },
        { label: 'Materiales' },
      ]}
      onCreateNew={isLead ? () => navigate(`/groups/${groupId}/materials/new`) : undefined}
      createButtonLabel="Nuevo Material"
      searchComponent={searchComponent}
      filtersComponent={filtersComponent}
      items={materials}
      isLoading={isLoading}
      renderItem={renderItem}
      paginationComponent={paginationComponent}
    />
  )
}
