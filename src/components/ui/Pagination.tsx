import * as React from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/Select'

function getPaginationRange(currentPage: number, totalPages: number, windowSize = 5): number[] {
  let start = Math.max(1, currentPage - Math.floor(windowSize / 2))
  const end = Math.min(totalPages, start + windowSize - 1)
  start = Math.max(1, end - windowSize + 1)

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
)
Pagination.displayName = 'Pagination'

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('flex flex-row items-center gap-1', className)} {...props} />
  )
)
PaginationContent.displayName = 'PaginationContent'

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn('', className)} {...props} />
)
PaginationItem.displayName = 'PaginationItem'

type PaginationLinkProps = {
  isActive?: boolean
  size?: string
} & React.ComponentProps<'button'>

const PaginationLink = ({ className, isActive, size: _size, ...props }: PaginationLinkProps) => (
  <button
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'h-9 w-9',
      isActive
        ? 'bg-brand-primary text-neutral-surface hover:bg-brand-primary-dark'
        : 'hover:bg-neutral-background text-neutral-text-primary',
      className
    )}
    {...props}
  />
)
PaginationLink.displayName = 'PaginationLink'

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="md"
    className={cn('w-auto gap-1 pl-2.5 pr-3', className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
)
PaginationPrevious.displayName = 'PaginationPrevious'

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="md"
    className={cn('w-auto gap-1 pl-3 pr-2.5', className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = 'PaginationNext'

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    aria-hidden
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = 'PaginationEllipsis'

interface PaginationNumbersProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  windowSize?: number
}

const PaginationNumbers = ({
  currentPage,
  totalPages,
  onPageChange,
  windowSize = 5,
}: PaginationNumbersProps) => {
  const pageNumbers = getPaginationRange(currentPage, totalPages, windowSize)
  const firstShown = pageNumbers[0]
  const lastShown = pageNumbers[pageNumbers.length - 1]

  return (
    <>
      {firstShown > 1 && (
        <>
          <PaginationItem>
            <PaginationLink isActive={currentPage === 1} onClick={() => onPageChange(1)}>
              1
            </PaginationLink>
          </PaginationItem>
          {firstShown > 2 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
        </>
      )}
      {pageNumbers.map((page) => (
        <PaginationItem key={page}>
          <PaginationLink isActive={page === currentPage} onClick={() => onPageChange(page)}>
            {page}
          </PaginationLink>
        </PaginationItem>
      ))}
      {lastShown < totalPages && (
        <>
          {lastShown < totalPages - 1 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationLink isActive={currentPage === totalPages} onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        </>
      )}
    </>
  )
}
PaginationNumbers.displayName = 'PaginationNumbers'

interface PaginationSizeSelectProps {
  value: number
  onChange: (size: number) => void
  sizeOptions?: number[]
}

const PaginationSizeSelect = ({ value, onChange, sizeOptions = [5, 10, 20, 50] }: PaginationSizeSelectProps) => (
  <div className="flex items-center gap-2">
    <span>Mostrar</span>
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="h-7 w-[64px] px-2 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sizeOptions.map((size) => (
          <SelectItem key={size} value={String(size)}>
            {size}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <span>por página</span>
  </div>
)
PaginationSizeSelect.displayName = 'PaginationSizeSelect'

interface PaginationSummaryProps {
  total: number
  totalLabel: string
  currentPage: number
  totalPages: number
  limit: number
  onLimitChange: (limit: number) => void
  sizeOptions?: number[]
}

const PaginationSummary = ({
  total,
  totalLabel,
  currentPage,
  totalPages,
  limit,
  onLimitChange,
  sizeOptions,
}: PaginationSummaryProps) => (
  <div className="flex items-center justify-between text-xs text-neutral-text-muted">
    <span>{total} {totalLabel}</span>
    <div className="flex items-center gap-4">
      <PaginationSizeSelect value={limit} onChange={onLimitChange} sizeOptions={sizeOptions} />
      <span>Página {currentPage} de {totalPages}</span>
    </div>
  </div>
)
PaginationSummary.displayName = 'PaginationSummary'

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  windowSize?: number
}

const PaginationControls = ({ currentPage, totalPages, onPageChange, windowSize }: PaginationControlsProps) => {
  if (totalPages <= 1) return null

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          />
        </PaginationItem>
        <PaginationNumbers
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          windowSize={windowSize}
        />
        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
PaginationControls.displayName = 'PaginationControls'

export {
  Pagination,
  PaginationContent,
  PaginationControls,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationNumbers,
  PaginationPrevious,
  PaginationSizeSelect,
  PaginationSummary,
}
