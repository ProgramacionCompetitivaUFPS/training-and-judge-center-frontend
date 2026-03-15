import { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { LucideIcon } from 'lucide-react'

export interface StatItem {
  label: string
  value: string | number
  icon?: LucideIcon
  color?: string
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  description?: string
}

interface StatsGridProps {
  stats: StatItem[]
  columns?: 1 | 2 | 3 | 4
}

export function StatsGrid({ stats, columns = 4 }: StatsGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              {Icon && (
                <Icon className={`h-4 w-4 ${stat.color || 'text-neutral-text-muted'}`} />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.trend && (
                <p className="text-xs text-neutral-text-muted mt-1">
                  <span
                    className={
                      stat.trend.isPositive
                        ? 'text-status-success'
                        : 'text-status-error'
                    }
                  >
                    {stat.trend.isPositive ? '+' : ''}
                    {stat.trend.value}%
                  </span>{' '}
                  {stat.trend.label}
                </p>
              )}
              {stat.description && (
                <p className="text-xs text-neutral-text-muted mt-1">
                  {stat.description}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
