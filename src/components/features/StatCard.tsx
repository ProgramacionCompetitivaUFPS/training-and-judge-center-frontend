import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  value: string | number
  label: string
  sub?: string
  icon?: ReactNode
  align?: 'center' | 'left'
  valueColor?: string
  valueSize?: 'text-2xl' | 'text-3xl'
  accentBorder?: string
}

export function StatCard({
  value,
  label,
  sub,
  icon,
  align = 'left',
  valueColor = 'text-neutral-text-primary',
  valueSize = 'text-2xl',
  accentBorder,
}: StatCardProps) {
  const valueClass = cn('font-bold font-mono', valueSize, valueColor)

  if (align === 'center') {
    return (
      <Card className={cn('p-5 text-center h-full', accentBorder && `border-t-2 ${accentBorder}`)}>
        {icon && <div className="flex justify-center mb-2">{icon}</div>}
        <p className={valueClass}>{value}</p>
        <p className="text-sm text-neutral-text-muted mt-1">{label}</p>
        {sub && <p className="text-xs text-neutral-text-muted opacity-60 mt-0.5">{sub}</p>}
      </Card>
    )
  }

  return (
    <Card className={cn('p-5 h-full', accentBorder && `border-t-2 ${accentBorder}`)}>
      <div className="flex items-start justify-between">
        <div>
          <p className={valueClass}>{value}</p>
          <p className="text-sm text-neutral-text-muted mt-1">{label}</p>
          {sub && <p className="text-xs text-neutral-text-muted mt-0.5">{sub}</p>}
        </div>
        {icon && (
          <div className="p-2 rounded-md bg-neutral-background border border-neutral-border">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
