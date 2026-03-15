import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/components/ui'
import { Problem } from '@/types'
import { CheckCircle, Clock } from 'lucide-react'

interface ProblemCardProps {
  problem: Problem
  isSolved?: boolean
  onClick?: () => void
}

export function ProblemCard({ problem, isSolved, onClick }: ProblemCardProps) {
  const difficultyVariant = {
    easy: 'success' as const,
    medium: 'primary' as const,
    hard: 'warning' as const,
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-elevation-2 transition-shadow"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isSolved && <CheckCircle className="h-5 w-5 text-status-success" />}
              <CardTitle className="text-lg">{problem.title}</CardTitle>
            </div>
            <CardDescription className="line-clamp-2">
              {problem.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <Badge variant={difficultyVariant[problem.difficulty]}>
              {problem.difficulty.toUpperCase()}
            </Badge>
            {problem.category.slice(0, 2).map((cat) => (
              <Badge key={cat} variant="outline">
                {cat}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-1 text-sm text-neutral-text-muted">
            <Clock className="h-4 w-4" />
            <span>{problem.acceptanceRate}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
