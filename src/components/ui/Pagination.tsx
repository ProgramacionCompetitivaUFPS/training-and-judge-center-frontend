import * as React from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationNumbers,
  PaginationPrevious,
}
