import * as React from 'react'
import { useNavigate, useHref, type To } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { TableRow } from './Table'

// Anything interactive inside the row keeps its own behavior instead of navigating.
const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], [role="checkbox"], [role="menuitem"]'

interface LinkTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  to: To
  state?: unknown
}

/**
 * A table row that navigates when clicked anywhere. Pair it with `<RowLink overlay={false}>` in the main
 * cell, which is the real link (middle click, "open in new tab", URL on hover, keyboard).
 *
 * It does not rely on a `position: relative` row as the containing block of a stretched-link overlay:
 * Safari ignores that on `<tr>` (WebKit bugs 240961 and 291407), so every row's overlay ended up covering
 * the whole table and a tap opened another row's URL.
 */
export const LinkTableRow = React.forwardRef<HTMLTableRowElement, LinkTableRowProps>(
  ({ to, state, className, onClick, onAuxClick, ...props }, ref) => {
    const navigate = useNavigate()
    const href = useHref(to)

    const handleClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
      onClick?.(e)
      if (e.defaultPrevented || e.button !== 0) return
      if ((e.target as HTMLElement).closest(INTERACTIVE)) return
      if (window.getSelection()?.toString()) return // the user was selecting text
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        window.open(href, '_blank', 'noopener,noreferrer')
        return
      }
      navigate(to, { state })
    }

    const handleAuxClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
      onAuxClick?.(e)
      if (e.defaultPrevented || e.button !== 1) return
      if ((e.target as HTMLElement).closest(INTERACTIVE)) return
      window.open(href, '_blank', 'noopener,noreferrer')
    }

    return (
      <TableRow
        ref={ref}
        className={cn('cursor-pointer', className)}
        onClick={handleClick}
        onAuxClick={handleAuxClick}
        {...props}
      />
    )
  },
)
LinkTableRow.displayName = 'LinkTableRow'
