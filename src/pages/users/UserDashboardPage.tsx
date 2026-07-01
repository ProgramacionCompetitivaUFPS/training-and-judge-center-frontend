import { Link } from 'react-router-dom'
import { Trophy, Code2, CheckCircle, Calendar, Send, ArrowRight, Flame } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/hooks/useAuth'
import { useUserDashboard } from '@/hooks/api/useUsers'
import { SUBMISSION_STATUS_CONFIG, ROUTES, PATHS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { SubmissionStatus } from '@/types'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function getMotivationalLine(
  data: { totalSubmissions: number; upcomingContests: number } | null
): string {
  if (!data) return 'Cargando tu actividad...'
  if (data.totalSubmissions === 0) return 'Resuelve tu primer problema para empezar tu historial.'
  if (data.upcomingContests > 0)
    return `Tienes ${data.upcomingContests} contest${data.upcomingContests > 1 ? 's' : ''} próximo${data.upcomingContests > 1 ? 's' : ''}.`
  return 'Sigue resolviendo — cada submission cuenta.'
}

function getContestUrgency(startTime: string): { label: string; urgent: boolean } {
  const now = new Date()
  const start = new Date(startTime)
  const diffMs = start.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const time = start.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  if (diffDays === 0) return { label: `HOY ${time}`, urgent: true }
  if (diffDays === 1) return { label: `MAÑANA ${time}`, urgent: true }
  return {
    label: start.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    urgent: false,
  }
}

export function UserDashboardPage() {
  const { user } = useAuth()
  const { data: dashboard, isLoading, error } = useUserDashboard()

  return (
    <AppLayout>
      <div className="space-y-8">

        {/* Header editorial */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-border">
          <div>
            <p className="text-xs font-semibold text-brand-primary uppercase tracking-[0.2em] mb-1">
              {getGreeting()}
            </p>
            <h1 className="text-4xl font-bold text-neutral-text-primary">
              {user?.name?.split(' ')[0] || 'Usuario'}
            </h1>
            <p className="text-neutral-text-muted mt-2">
              {getMotivationalLine(
                dashboard
                  ? {
                      totalSubmissions: dashboard.totalSubmissions,
                      upcomingContests: dashboard.upcomingContests.length,
                    }
                  : null
              )}
            </p>
          </div>
          {dashboard?.streak && dashboard.streak.currentStreak > 0 && (
            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Flame className="h-10 w-10 text-brand-accent" />
                <span className="text-2xl font-bold text-neutral-text-primary leading-none">
                  {dashboard.streak.currentStreak}
                </span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs text-neutral-text-muted">
                  {dashboard.streak.currentStreak === 1 ? 'día de racha' : 'días de racha'}
                </span>
                <span className="text-xs text-neutral-text-muted">
                  mejor: {dashboard.streak.longestStreak}
                </span>
              </div>
            </div>
          )}
        </div>

        {error && <Alert variant="error">No se pudo cargar el dashboard.</Alert>}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : dashboard ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(
                [
                  {
                    icon: <Code2 className="h-5 w-5 text-brand-primary" />,
                    label: 'Submissions',
                    value: dashboard.totalSubmissions,
                    accent: 'border-t-brand-primary',
                  },
                  {
                    icon: <CheckCircle className="h-5 w-5 text-status-success" />,
                    label: 'Aceptados',
                    value: dashboard.acceptedSubmissions,
                    accent: 'border-t-status-success',
                    subtitle:
                      dashboard.totalSubmissions > 0
                        ? `${Math.round((dashboard.acceptedSubmissions / dashboard.totalSubmissions) * 100)}% tasa de aceptación`
                        : undefined,
                  },
                  {
                    icon: <Trophy className="h-5 w-5 text-brand-accent" />,
                    label: 'Problemas Resueltos',
                    value: dashboard.problemsSolved,
                    accent: 'border-t-brand-accent',
                  },
                  {
                    icon: <Calendar className="h-5 w-5 text-status-warning" />,
                    label: 'Contests',
                    value: dashboard.contestsParticipated,
                    accent: 'border-t-status-warning',
                  },
                ] as Array<StatCardProps>
              ).map((props, i) => (
                <div
                  key={props.label}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${i * 75}ms` }}
                >
                  <StatCard {...props} />
                </div>
              ))}
            </div>

            {/* Listas — asimétrico 2/3 + 1/3 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Submissions recientes — 2/3 */}
              <Card className="p-6 lg:col-span-2">
                <h2 className="text-base font-semibold text-neutral-text-primary mb-4">
                  Submissions Recientes
                </h2>
                {dashboard.recentSubmissions.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <Send className="h-8 w-8 text-neutral-border" />
                    <p className="text-sm text-neutral-text-muted">Aún no tienes submissions.</p>
                    <Link
                      to={ROUTES.PROBLEMS}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline"
                    >
                      Ver problemas <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-border">
                    {dashboard.recentSubmissions.map((sub) => {
                      const statusConfig = SUBMISSION_STATUS_CONFIG[sub.status as SubmissionStatus]
                      return (
                        <div key={sub.id} className="flex items-center justify-between py-3 text-sm">
                          <div>
                            <Link
                              to={PATHS.problem(sub.problemSlug)}
                              className="font-medium text-brand-primary hover:text-brand-primary-dark transition-colors"
                            >
                              {sub.problemTitle}
                            </Link>
                            <p className="text-xs text-neutral-text-muted mt-0.5">
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

              {/* Próximos Contests — 1/3 */}
              <Card className="p-6">
                <h2 className="text-base font-semibold text-neutral-text-primary mb-4">
                  Próximos Contests
                </h2>
                {dashboard.upcomingContests.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <Trophy className="h-8 w-8 text-neutral-border" />
                    <p className="text-sm text-neutral-text-muted">No hay contests próximos en tus grupos.</p>
                    <Link
                      to={ROUTES.GROUPS}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline"
                    >
                      Ver mis grupos <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-border">
                    {dashboard.upcomingContests.map((contest) => {
                      const urgency = getContestUrgency(contest.startTime)
                      return (
                        <Link
                          key={contest.id}
                          to={PATHS.contest(contest.groupId, contest.id)}
                          className="block py-3 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium text-neutral-text-primary group-hover:text-brand-primary transition-colors leading-snug">
                              {contest.name}
                            </span>
                            <span
                              className={cn(
                                'shrink-0 text-xs',
                                urgency.urgent
                                  ? 'font-bold px-2 py-0.5 rounded-pill bg-brand-primary text-neutral-text-inverse'
                                  : 'text-neutral-text-muted'
                              )}
                            >
                              {urgency.label}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-text-muted mt-0.5">{contest.groupName}</p>
                        </Link>
                      )
                    })}
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

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  subtitle?: string
  accent: string
}

function StatCard({ icon, label, value, subtitle, accent }: StatCardProps) {
  return (
    <Card className={cn('p-5 border-t-2 h-full', accent)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold text-neutral-text-primary">{value}</p>
          <p className="text-sm text-neutral-text-muted mt-1">{label}</p>
          {subtitle && (
            <p className="text-xs text-neutral-text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="p-2 rounded-md bg-neutral-background border border-neutral-border">
          {icon}
        </div>
      </div>
    </Card>
  )
}
