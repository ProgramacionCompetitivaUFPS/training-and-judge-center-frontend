import { ReactNode } from 'react'
import { Input, Button } from '@/components/ui'
import { Search, Filter, X } from 'lucide-react'

export interface FilterConfig {
  key: string
  label: string
  component: ReactNode
}

interface SearchAndFilterProps {
  // Search
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  
  // Filters
  filters?: FilterConfig[]
  activeFiltersCount?: number
  onClearFilters?: () => void
  
  // Actions
  additionalActions?: ReactNode
}

export function SearchAndFilter({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters,
  activeFiltersCount = 0,
  onClearFilters,
  additionalActions,
}: SearchAndFilterProps) {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10"
          />
        </div>
        {additionalActions}
      </div>

      {/* Filters */}
      {filters && filters.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-neutral-text-muted" />
              <span className="text-sm font-medium text-neutral-text-primary">
                Filtros
              </span>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-pill bg-brand-primary text-neutral-surface">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            {activeFiltersCount > 0 && onClearFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="gap-1"
              >
                <X className="h-3 w-3" />
                Limpiar
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-neutral-text-primary mb-2">
                  {filter.label}
                </label>
                {filter.component}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
