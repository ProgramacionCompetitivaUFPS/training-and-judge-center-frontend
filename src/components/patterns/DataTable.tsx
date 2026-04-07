import { ReactNode } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  Checkbox,
} from '@/components/ui'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T) => ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T extends object> {
  columns: Column<T>[]
  data: T[]
  
  // Selection
  selectable?: boolean
  selectedItems?: Set<string>
  onSelectionChange?: (selected: Set<string>) => void
  getItemId?: (item: T) => string
  
  // Sorting
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (key: string) => void
  
  // Row Actions
  onRowClick?: (item: T) => void
  
  // Empty State
  emptyMessage?: string
  
  // Loading
  isLoading?: boolean
}

export function DataTable<T extends object>({
  columns,
  data,
  selectable = false,
  selectedItems = new Set(),
  onSelectionChange,
  getItemId = (item) => (item as Record<string, unknown>).id as string,
  sortBy,
  sortDirection,
  onSort,
  onRowClick,
  emptyMessage = 'No hay datos disponibles',
  isLoading = false,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((item) => selectedItems.has(getItemId(item)))
  const someSelected = data.some((item) => selectedItems.has(getItemId(item))) && !allSelected

  const handleSelectAll = () => {
    if (!onSelectionChange) return
    
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      const newSelected = new Set(data.map(getItemId))
      onSelectionChange(newSelected)
    }
  }

  const handleSelectItem = (itemId: string) => {
    if (!onSelectionChange) return
    
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    onSelectionChange(newSelected)
  }

  const handleSort = (key: string) => {
    if (onSort) {
      onSort(key)
    }
  }

  const getSortIcon = (key: string) => {
    if (sortBy !== key) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="h-4 bg-neutral-border rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-neutral-text-muted">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className={someSelected ? 'opacity-50' : ''}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  style={{ width: column.width }}
                  className={`${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''}`}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center hover:text-brand-primary transition-colors"
                    >
                      {column.label}
                      {getSortIcon(column.key)}
                    </button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => {
              const itemId = getItemId(item)
              const isSelected = selectedItems.has(itemId)
              
              return (
                <TableRow
                  key={itemId}
                  onClick={() => onRowClick?.(item)}
                  className={`${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-brand-primary-muted' : ''}`}
                >
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectItem(itemId)}
                        aria-label={`Select item ${itemId}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={`${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''}`}
                    >
                      {column.render ? column.render(item) : ((item as Record<string, unknown>)[column.key] as ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
