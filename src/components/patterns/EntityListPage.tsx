import { ReactNode } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { BreadcrumbItem } from '@/components/layout/Breadcrumbs'
import { Button, Card, CardContent } from '@/components/ui'
import { Plus } from 'lucide-react'

interface EntityListPageProps<T> {
  // Header
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  
  // Actions
  onCreateNew?: () => void
  createButtonLabel?: string
  headerActions?: ReactNode
  
  // Search & Filters
  searchComponent?: ReactNode
  filtersComponent?: ReactNode
  
  // Data
  items: T[]
  isLoading?: boolean
  
  // Rendering
  renderItem: (item: T, index: number) => ReactNode
  renderEmpty?: () => ReactNode
  renderLoading?: () => ReactNode
  
  // Pagination
  paginationComponent?: ReactNode
  
  // Layout
  showSidebar?: boolean
  maxWidth?: 'full' | 'container' | 'narrow'
}

export function EntityListPage<T>({
  title,
  description,
  breadcrumbs,
  onCreateNew,
  createButtonLabel = 'Crear Nuevo',
  headerActions,
  searchComponent,
  filtersComponent,
  items,
  isLoading = false,
  renderItem,
  renderEmpty,
  renderLoading,
  paginationComponent,
  showSidebar = true,
  maxWidth = 'container',
}: EntityListPageProps<T>) {
  const defaultEmpty = () => (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-neutral-text-muted">No se encontraron resultados</p>
      </CardContent>
    </Card>
  )

  const defaultLoading = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="py-8">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-neutral-border rounded w-3/4" />
              <div className="h-4 bg-neutral-border rounded w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <AppLayout
      breadcrumbs={breadcrumbs}
      showSidebar={showSidebar}
      maxWidth={maxWidth}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-text-primary mb-2">
              {title}
            </h1>
            {description && (
              <p className="text-neutral-text-muted">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            {onCreateNew && (
              <Button onClick={onCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                {createButtonLabel}
              </Button>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        {(searchComponent || filtersComponent) && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {searchComponent}
                {filtersComponent}
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
        <div className="space-y-4">
          {isLoading
            ? (renderLoading || defaultLoading)()
            : items.length === 0
            ? (renderEmpty || defaultEmpty)()
            : items.map((item, index) => renderItem(item, index))}
        </div>

        {/* Pagination */}
        {paginationComponent && items.length > 0 && (
          <div className="flex justify-center">{paginationComponent}</div>
        )}
      </div>
    </AppLayout>
  )
}
