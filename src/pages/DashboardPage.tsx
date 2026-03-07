import { AppLayout } from '@/components/layout/AppLayout'
import { UserStats } from '@/components/features/UserStats'
import { ProblemCard } from '@/components/features/ProblemCard'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui'
import { TrendingUp, Calendar, Award } from 'lucide-react'
import { Problem } from '@/types'

// Mock data
const recentProblems: Problem[] = [
  {
    id: '1',
    title: 'Two Sum',
    difficulty: 'easy',
    category: ['Array', 'Hash Table'],
    description: 'Given an array of integers nums and an integer target...',
    constraints: [],
    examples: [],
    acceptanceRate: 48.5,
    totalSubmissions: 15234,
    totalAccepted: 7389,
  },
  {
    id: '2',
    title: 'Binary Search',
    difficulty: 'medium',
    category: ['Binary Search', 'Array'],
    description: 'Given an array of integers nums which is sorted...',
    constraints: [],
    examples: [],
    acceptanceRate: 55.2,
    totalSubmissions: 8932,
    totalAccepted: 4930,
  },
]

const upcomingContests = [
  {
    id: '1',
    title: 'Weekly Contest 385',
    date: '2024-03-10',
    time: '10:00 AM',
    participants: 1234,
  },
  {
    id: '2',
    title: 'Biweekly Contest 125',
    date: '2024-03-15',
    time: '2:30 PM',
    participants: 892,
  },
]

const recentActivity = [
  {
    id: '1',
    action: 'Resolvió',
    problem: 'Two Sum',
    time: 'Hace 2 horas',
    status: 'AC',
  },
  {
    id: '2',
    action: 'Intentó',
    problem: 'Binary Search',
    time: 'Hace 5 horas',
    status: 'WA',
  },
  {
    id: '3',
    action: 'Resolvió',
    problem: 'Valid Parentheses',
    time: 'Hace 1 día',
    status: 'AC',
  },
]

export function DashboardPage() {
  return (
    <AppLayout showSidebar={true}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-text-primary mb-2">
            ¡Bienvenido de nuevo!
          </h1>
          <p className="text-neutral-text-muted">
            Continúa tu progreso y alcanza tus metas de programación
          </p>
        </div>

        {/* User Stats */}
        <UserStats
          solvedProblems={45}
          totalProblems={150}
          submissions={128}
          rank={234}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recent Problems & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Continue Learning */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-neutral-text-primary">
                  Continúa Aprendiendo
                </h2>
                <Button variant="ghost" size="sm">
                  Ver todos
                </Button>
              </div>
              <div className="space-y-4">
                {recentProblems.map((problem) => (
                  <ProblemCard
                    key={problem.id}
                    problem={problem}
                    onClick={() => console.log('Navigate to', problem.id)}
                  />
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between py-2 border-b border-neutral-border last:border-0"
                    >
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="text-neutral-text-muted">
                            {activity.action}
                          </span>{' '}
                          <span className="font-medium text-neutral-text-primary">
                            {activity.problem}
                          </span>
                        </p>
                        <p className="text-xs text-neutral-text-muted">
                          {activity.time}
                        </p>
                      </div>
                      <Badge
                        variant={activity.status === 'AC' ? 'success' : 'error'}
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Contests & Achievements */}
          <div className="space-y-6">
            {/* Upcoming Contests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Próximas Competencias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingContests.map((contest) => (
                    <div
                      key={contest.id}
                      className="p-3 rounded-md bg-neutral-background hover:bg-brand-primary-muted transition-colors cursor-pointer"
                    >
                      <h4 className="font-semibold text-sm mb-1">
                        {contest.title}
                      </h4>
                      <p className="text-xs text-neutral-text-muted mb-2">
                        {contest.date} • {contest.time}
                      </p>
                      <p className="text-xs text-neutral-text-muted">
                        {contest.participants} participantes
                      </p>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" size="sm">
                    Ver todas las competencias
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Logros Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-brand-accent-muted flex items-center justify-center">
                      <Award className="h-6 w-6 text-brand-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        Primer Problema Resuelto
                      </p>
                      <p className="text-xs text-neutral-text-muted">
                        Hace 2 días
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-status-success/10 flex items-center justify-center">
                      <Award className="h-6 w-6 text-status-success" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Racha de 7 días</p>
                      <p className="text-xs text-neutral-text-muted">
                        Hace 1 semana
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
