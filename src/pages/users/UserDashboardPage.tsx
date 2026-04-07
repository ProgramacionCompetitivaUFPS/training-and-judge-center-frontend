import { Link } from 'react-router-dom'
import { Trophy, Code2, CheckCircle, Calendar } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/hooks/useAuth'
import { useUserDashboard } from '@/hooks/api/useUsers'
import { SUBMISSION_STATUS_CONFIG, ROUTES } from '@/lib/constants'
import type { SubmissionStatus } from '@/types'

export function UserDashboardPage() {
  const { user } = useAuth()
  const { data: dashboard, isLoading, error } = useUserDashboard()

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-text-primary">
            Hola, {user?.name?.split(' ')[0] || 'Usuario'}
          </h1>
          <p className="text-neutral-text-muted">Tu resumen de actividad</p>
        </div>

        {error && <Alert variant="error">No se pudo cargar el dashboard.</Alert>}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : dashboard ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<Code2 className="h-5 w-5 text-brand-primary" />}
                label="Submissions"
                value={dashboard.totalSubmissions}
              />
              <StatCard
                icon={<CheckCircle className="h-5 w-5 text-status-success" />}
                label="Aceptados"
                value={dashboard.acceptedSubmissions}
              />
              <StatCard
                icon={<Trophy className="h-5 w-5 text-brand-accent" />}
                label="Problemas Resueltos"
                value={dashboard.problemsSolved}
              />
              <StatCard
                icon={<Calendar className="h-5 w-5 text-status-warning" />}
                label="Contests"
                value={dashboard.contestsParticipated}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-neutral-text-primary mb-4">
                  Submissions Recientes
                </h2>
                {dashboard.recentSubmissions.length === 0 ? (
                  <p className="text-sm text-neutral-text-muted">No hay submissions aún.</p>
                ) : (
                  <div className="space-y-3">
                    {dashboard.recentSubmissions.map((sub) => {
                      const statusConfig = SUBMISSION_STATUS_CONFIG[sub.status as SubmissionStatus]
                      return (
                        <div key={sub.id} className="flex items-center justify-between text-sm">
                          <div>
                            <Link
                              to={ROUTES.PROBLEM_DETAIL.replace(':slug', sub.problemSlug)}
                              className="text-brand-primary hover:underline"
                            >
                              {sub.problemTitle}
                            </Link>
                            <p className="text-xs text-neutral-text-muted">
                              {sub.language} · {new Date(sub.submittedAt).toLocaleDateString('es')}
                            </p>
                          </div>
                          {statusConfig && (
                            <Badge variant={statusConfig.color === 'success' ? 'default' : 'outline'}>
                              {statusConfig.label}
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold text-neutral-text-primary mb-4">
                  Próximos Contests
                </h2>
                {dashboard.upcomingContests.length === 0 ? (
                  <p className="text-sm text-neutral-text-muted">No hay contests próximos.</p>
                ) : (
                  <div className="space-y-3">
                    {dashboard.upcomingContests.map((contest) => (
                      <div key={contest.id} className="flex items-center justify-between text-sm">
                        <div>
                          <Link
                            to={ROUTES.CONTEST_DETAIL.replace(':id', contest.id)}
                            className="text-brand-primary hover:underline"
                          >
                            {contest.name}
                          </Link>
                          <p className="text-xs text-neutral-text-muted">{contest.groupName}</p>
                        </div>
                        <span className="text-xs text-neutral-text-muted">
                          {new Date(contest.startTime).toLocaleDateString('es', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}

interface StatCardProps { icon: React.ReactNode; label: string; value: number }

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className="p-2 rounded-lg bg-neutral-surface">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-neutral-text-primary">{value}</p>
        <p className="text-sm text-neutral-text-muted">{label}</p>
      </div>
    </Card>
  )
}
