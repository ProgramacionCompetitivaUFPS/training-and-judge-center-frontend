import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Trophy, Target, TrendingUp, Award } from 'lucide-react'

interface UserStatsProps {
  solvedProblems: number
  totalProblems: number
  submissions: number
  rank?: number
}

export function UserStats({ solvedProblems, totalProblems, submissions, rank }: UserStatsProps) {
  const solvedPercentage = Math.round((solvedProblems / totalProblems) * 100)

  const stats = [
    {
      icon: Target,
      label: 'Problemas Resueltos',
      value: `${solvedProblems}/${totalProblems}`,
      color: 'text-brand-primary',
    },
    {
      icon: TrendingUp,
      label: 'Tasa de Éxito',
      value: `${solvedPercentage}%`,
      color: 'text-status-success',
    },
    {
      icon: Trophy,
      label: 'Total Envíos',
      value: submissions.toString(),
      color: 'text-brand-accent',
    },
    ...(rank
      ? [
          {
            icon: Award,
            label: 'Ranking',
            value: `#${rank}`,
            color: 'text-brand-primary',
          },
        ]
      : []),
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
