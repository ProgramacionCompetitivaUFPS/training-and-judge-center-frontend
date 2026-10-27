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
import { SearchSelect } from '@/components/ui/SearchSelect'
import { MaterialListItem } from '@/components/features/MaterialListItem'
import { TagFilterChips } from '@/components/features/TagFilterChips'
import { useMaterials, useMaterialTags, useMaterialAuthors } from '@/hooks/api/useMaterials'
import { useGroupDetail } from '@/hooks/api/useGroups'
import { useSearchUsers } from '@/hooks/api/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { usePaginationHandlers } from '@/hooks/usePaginationHandlers'
import { cn } from '@/lib/utils'
import type { MaterialListParams, MaterialStatus } from '@/types/material'

const PINNED_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pinned', label: 'Solo fijados' },
  { value: 'unpinned', label: 'No fijados' },
]

// La búsqueda es full-text por prefijo (ver repository.go): con 1 carácter el GIN de Postgres
// matchea demasiados lexemas candidatos. Exigir un mínimo evita escaneos innecesariamente amplios
// mientras el usuario todavía está escribiendo la primera letra.
const MIN_SEARCH_LENGTH = 2

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'PUBLISHED', label: 'Publicados' },
  { value: 'DRAFT', label: 'Borrador' },
]

export function MaterialsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: groupDetail } = useGroupDetail(groupId!)
  // Real leadership of this specific group — the backend already rejects create/pin/unpin from
  // a Coach who isn't actually a leader of this group (create_material.go, pin_material.go).
  const isLead = user?.role === 'ADMIN' || groupDetail?.userMembership.role === 'LEAD'

  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [manualTag, setManualTag] = useState('')
  const [pinnedFilter, setPinnedFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  // El filtro de autor es exacto en el backend (match completo de nickname, no fuzzy) — por
  // eso no se aplica en vivo mientras se escribe (como la búsqueda de texto), solo al elegir
  // una sugerencia o al presionar Enter. `authorInput` es solo el texto visible/en edición;
  // `confirmedAuthor` es lo que realmente se manda como filtro.
  const [authorInput, setAuthorInput] = useState('')
  const [confirmedAuthor, setConfirmedAuthor] = useState('')
  const [publishedFrom, setPublishedFrom] = useState('')
  const [publishedTo, setPublishedTo] = useState('')
  const [sort, setSort] = useState<MaterialListParams['sort']>('relevance')
  const [pageQuery, setPageQuery] = useState({ page: 1, limit: 5 })
  const debouncedSearch = useDebounce(search, 300)
  const debouncedManualTag = useDebounce(manualTag, 300)
  const trimmedSearch = debouncedSearch.trim()
  const searchTooShort = trimmedSearch.length > 0 && trimmedSearch.length < MIN_SEARCH_LENGTH
  const activeSearch = trimmedSearch.length >= MIN_SEARCH_LENGTH ? trimmedSearch : ''
  // El tag manual gana sobre el chip seleccionado: escribir uno limpia la selección de chip
  // (ver onChange más abajo), así que nunca están activos los dos a la vez.
  const activeTag = selectedTag ?? (debouncedManualTag.trim().toLowerCase() || null)

  const { handlePageChange, handleLimitChange } = usePaginationHandlers(setPageQuery)

  const params: MaterialListParams = {
    page: pageQuery.page,
    limit: pageQuery.limit,
    ...(activeSearch && { q: activeSearch }),
    ...(pinnedFilter !== 'all' && { pinned: pinnedFilter === 'pinned' }),
    ...(activeTag && { tags: activeTag }),
    ...(statusFilter !== 'all' && { status: statusFilter as MaterialStatus }),
    ...(confirmedAuthor && { author: confirmedAuthor }),
    ...(publishedFrom && { publishedFrom }),
    ...(publishedTo && { publishedTo }),
    ...(sort && sort !== 'relevance' && { sort }),
  }

  const { data, isLoading } = useMaterials(groupId!, params)
  const materials = data?.materials ?? []
  const pagination = data?.pagination
  const { data: tagsData } = useMaterialTags(groupId!)
  const availableTags = tagsData?.tags ?? []
  const { data: authorsData } = useMaterialAuthors(groupId!)
  const availableAuthors = authorsData?.authors ?? []
  const authorQuery = authorInput.trim().toLowerCase()
  const localAuthorMatches = authorQuery
    ? availableAuthors.filter((a) => a.nickname.toLowerCase().includes(authorQuery) || a.name.toLowerCase().includes(authorQuery))
    : availableAuthors
  // Los autores recientes del grupo (arriba) son más relevantes para este filtro, pero no
  // cubren a alguien que escribió hace tiempo y ya no sale en la muestra — /users/search cubre
  // ese caso como respaldo (mismo endpoint ya usado en Grupos/Equipos para invitar).
  const debouncedAuthorQuery = useDebounce(authorInput, 300)
  const { data: userSearchData, isFetching: isSearchingAuthors } = useSearchUsers(debouncedAuthorQuery)
  const authorSuggestions = [
    ...localAuthorMatches,
    ...(userSearchData?.users ?? []).filter((u) => !localAuthorMatches.some((a) => a.nickname === u.nickname)),
  ].slice(0, 8)

  function handleTagClick(tag: string) {
    setManualTag('')
    setSelectedTag((prev) => (prev === tag ? null : tag))
    setPageQuery((p) => ({ ...p, page: 1 }))
  }

  function confirmAuthor(nickname: string) {
    setConfirmedAuthor(nickname)
    setAuthorInput(nickname)
    setPageQuery((p) => ({ ...p, page: 1 }))
  }

  function handleAuthorKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmAuthor(authorInput.trim())
    }
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
          <div className="max-w-md">
            <div className="relative">
              <Search className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
              <Input
                variant="ghost"
                placeholder="Buscar materiales..."
                className="pl-7"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPageQuery((p) => ({ ...p, page: 1 })) }}
              />
            </div>
            {searchTooShort && (
              <p className="text-xs text-neutral-text-muted mt-1 pl-1">
                Escribe al menos {MIN_SEARCH_LENGTH} caracteres para buscar
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-neutral-text-muted mr-1">Autor</span>
              <SearchSelect
                className="w-[200px]"
                query={authorInput}
                onQueryChange={(value) => {
                  setAuthorInput(value)
                  // Borrar el texto limpia el filtro de inmediato (sin esto, confirmedAuthor se
                  // queda con el último valor confirmado para siempre). Escribir texto nuevo
                  // sigue sin aplicarse hasta confirmar (Enter/elegir una sugerencia).
                  if (value.trim() === '') {
                    setConfirmedAuthor('')
                    setPageQuery((p) => ({ ...p, page: 1 }))
                  }
                }}
                onInputKeyDown={handleAuthorKeyDown}
                results={authorSuggestions}
                isSearching={isSearchingAuthors}
                minChars={0}
                placeholder="Nickname..."
                emptyLabel="Presiona Enter para usar este nickname"
                getKey={(a) => a.nickname}
                renderItem={(a) => (
                  <>
                    <span className="font-medium text-neutral-text-primary">{a.nickname}</span>
                    <span className="text-neutral-text-muted"> · {a.name}</span>
                  </>
                )}
                onSelect={(a) => confirmAuthor(a.nickname)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-neutral-text-muted mr-1">Publicado</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-text-muted">Desde</span>
                <Input
                  type="date"
                  variant="ghost"
                  containerClassName="w-[170px]"
                  className={cn(
                    'pr-2 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-40 [&::-webkit-calendar-picker-indicator]:hover:opacity-80',
                    !publishedFrom && 'text-neutral-text-muted'
                  )}
                  aria-label="Publicado desde"
                  value={publishedFrom}
                  onChange={(e) => { setPublishedFrom(e.target.value); setPageQuery((p) => ({ ...p, page: 1 })) }}
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
                    !publishedTo && 'text-neutral-text-muted'
                  )}
                  aria-label="Publicado hasta"
                  value={publishedTo}
                  onChange={(e) => { setPublishedTo(e.target.value); setPageQuery((p) => ({ ...p, page: 1 })) }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-neutral-text-muted mr-1">Fijados</span>
              {PINNED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setPinnedFilter(opt.value); setPageQuery((p) => ({ ...p, page: 1 })) }}
                  className={cn(
                    'px-3 py-1 rounded-pill text-xs font-bold transition-colors',
                    pinnedFilter === opt.value
                      ? 'bg-brand-primary text-neutral-surface'
                      : 'bg-neutral-border/50 text-neutral-text-primary hover:bg-neutral-border'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {isLead && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-neutral-text-muted mr-1">Estado</span>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setStatusFilter(opt.value); setPageQuery((p) => ({ ...p, page: 1 })) }}
                    className={cn(
                      'px-3 py-1 rounded-pill text-xs font-bold transition-colors',
                      statusFilter === opt.value
                        ? 'bg-brand-primary text-neutral-surface'
                        : 'bg-neutral-border/50 text-neutral-text-primary hover:bg-neutral-border'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {availableTags.length > 0 && (
              <TagFilterChips
                tags={availableTags}
                selectedTag={selectedTag}
                onTagClick={handleTagClick}
                onClear={() => { setSelectedTag(null); setManualTag(''); setPageQuery((p) => ({ ...p, page: 1 })) }}
              />
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-neutral-text-muted">
                {availableTags.length > 0 ? 'u otro tag:' : 'Tag:'}
              </span>
              <Input
                variant="ghost"
                containerClassName="w-[140px]"
                placeholder="tag exacto..."
                value={manualTag}
                onChange={(e) => {
                  setManualTag(e.target.value)
                  setSelectedTag(null)
                  setPageQuery((p) => ({ ...p, page: 1 }))
                }}
              />
            </div>
          </div>
        </div>

        {/* Results count + sort (sort lives here, not squeezed among the filters above) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1">
            {pagination && !isLoading && (
              <PaginationSummary
                total={pagination.total}
                totalLabel="materiales"
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                limit={pageQuery.limit}
                onLimitChange={handleLimitChange}
              />
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-text-muted">Ordenar por</span>
              <Select value={sort} onValueChange={(v) => { setSort(v as MaterialListParams['sort']); setPageQuery((p) => ({ ...p, page: 1 })) }}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevancia</SelectItem>
                  <SelectItem value="publishedAt">Fecha de publicación</SelectItem>
                  <SelectItem value="title">Título</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Los fijados van primero con "Relevancia" o "Fecha de publicación", salvo que haya una búsqueda activa. */}
            <span className="text-xs text-neutral-text-muted">
              {sort === 'title'
                ? 'Los fijados no se priorizan ordenando por título'
                : activeSearch
                  ? 'Buscando: los fijados no se priorizan'
                  : 'Los fijados aparecen primero'}
            </span>
          </div>
        </div>

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
                    href={`/groups/${groupId}/materials/${material.id}`}
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
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </AppLayout>
  )
}
