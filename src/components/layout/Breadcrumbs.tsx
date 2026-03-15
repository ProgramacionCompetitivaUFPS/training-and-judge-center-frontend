import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ElementType
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-1 text-sm', className)}
    >
      {/* Home */}
      <a
        href="#"
        className="flex items-center text-neutral-text-muted hover:text-brand-primary transition-colors"
      >
        <Home className="h-4 w-4" />
      </a>

      {items.map((item, index) => {
        const Icon = item.icon
        const isLast = index === items.length - 1

        return (
          <div key={index} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-neutral-text-muted mx-1" />
            {item.href && !isLast ? (
              <a
                href={item.href}
                className="flex items-center gap-1 text-neutral-text-muted hover:text-brand-primary transition-colors"
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{item.label}</span>
              </a>
            ) : (
              <span
                className={cn(
                  'flex items-center gap-1',
                  isLast
                    ? 'text-neutral-text-primary font-medium'
                    : 'text-neutral-text-muted'
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{item.label}</span>
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
