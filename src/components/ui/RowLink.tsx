import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * The link of a card or list row. Put it around the main content and give the container `relative`: its
 * invisible overlay (`after:absolute after:inset-0`) makes the whole row clickable, while for the
 * browser it is a real link, so middle click, Ctrl/Cmd+click, "Open in new tab" and seeing the URL on
 * hover all work. Anything interactive inside the row must sit above the overlay (`relative z-10`).
 */
interface RowLinkProps extends LinkProps {
  /**
   * Stretch the link over the whole positioned parent. Turn it off inside table rows (use
   * `LinkTableRow` instead): Safari does not treat a `<tr>` as the containing block of the overlay.
   */
  overlay?: boolean
}

export function RowLink({ className, overlay = true, ...props }: RowLinkProps) {
  return (
    <Link
      className={cn(
        'block text-inherit no-underline',
        overlay
          ? 'after:absolute after:inset-0 after:content-[""] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand-primary'
          : 'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
        className,
      )}
      {...props}
    />
  )
}
