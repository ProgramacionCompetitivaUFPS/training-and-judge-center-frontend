import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * The link of a table row. Put it around the main cell's content and give the row `relative`: its
 * invisible overlay (`after:absolute after:inset-0`) makes the whole row clickable, while for the
 * browser it is a real link, so middle click, Ctrl/Cmd+click, "Open in new tab" and seeing the URL on
 * hover all work. Anything interactive inside the row must sit above the overlay (`relative z-10`).
 */
export function RowLink({ className, ...props }: LinkProps) {
  return (
    <Link
      className={cn(
        'block text-inherit no-underline after:absolute after:inset-0 after:content-[""]',
        'focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand-primary',
        className,
      )}
      {...props}
    />
  )
}
