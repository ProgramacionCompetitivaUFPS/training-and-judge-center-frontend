import { ReactNode } from 'react'
import { Card, CardContent, Button } from '@/components/ui'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  children?: ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          {Icon && (
            <div className="h-16 w-16 rounded-full bg-neutral-background flex items-center justify-center mb-4">
              <Icon className="h-8 w-8 text-neutral-text-muted" />
            </div>
          )}
          <h3 className="text-lg font-semibold text-neutral-text-primary mb-2">
            {title}
          </h3>
          {description && (
            <p className="text-neutral-text-muted mb-6">{description}</p>
          )}
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
