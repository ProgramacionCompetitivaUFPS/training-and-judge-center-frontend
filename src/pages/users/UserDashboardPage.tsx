import { Link } from 'react-router-dom'
import { CheckCircle, Clock, Trophy, FileText, Send, ArrowRight, Flame } from 'lucide-react'
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
import type { DashboardContest } from '@/types/user'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function getMotivationalLine(upcomingCount: number, activeCount: number): string {
  if (activeCount > 0) return `Tienes ${activeCount} contest${activeCount > 1 ? 's' : ''} en vivo ahora.`
  if (upcomingCount > 0)
    return `Tienes ${upcomingCount} contest${upcomingCount > 1 ? 's' : ''} próximo${upcomingCount > 1 ? 's' : ''}.`
  return 'Sigue resolviendo — cada submission cuenta.'
}

function getContestUrgency(startDate: string): { label: string; urgent: boolean } {
  const now = new Date()
  const start = new Date(startDate)
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

function getCountdown(startDate: string): string {
  const diffMs = new Date(startDate).getTime() - Date.now()
  if (diffMs <= 0) return 'En curso'
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d ${hours}h`
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

export function UserDashboardPage() {
  const { user } = useAuth()
  const { data: dashboard, isLoading, error } = useUserDashboard()
  const previewLimit = 5

  const nextContest = dashboard?.upcomingContests[0] ?? null
  const lastResult = dashboard?.recentContestResults[0] ?? null

  const liveContests = dashboard?.activeContests ?? []
  const upcomingContests = dashboard?.upcomingContests ?? []
  const myContests: Array<DashboardContest & { live: boolean }> = [
    ...liveContests.map((c) => ({ ...c, live: true })),
    ...[...upcomingContests]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .map((c) => ({ ...c, live: false })),
  ]
  const visibleContests = myContests.slice(0, previewLimit)
  const visibleSubmissions = dashboard?.recentSubmissions.slice(0, previewLimit) ?? []
  const hasMoreSubmissions = (dashboard?.recentSubmissions.length ?? 0) > previewLimit

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
              {dashboard
                ? getMotivationalLine(dashboard.upcomingContests.length, dashboard.activeContests.length)
                : 'Cargando tu actividad...'}
            </p>
          </div>
          {dashboard?.streak && (
            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Flame
                  className={cn(
                    'h-10 w-10',
                    dashboard.streak.current > 0 ? 'text-brand-accent' : 'text-neutral-border'
                  )}
                />
                <span className="text-2xl font-bold text-neutral-text-primary leading-none">
                  {dashboard.streak.current}
                </span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs text-neutral-text-muted">
                  {dashboard.streak.current === 0
                    ? '¡Resuelve hoy para empezar tu racha!'
                    : dashboard.streak.current === 1
                      ? 'día de racha'
                      : 'días de racha'}
                </span>
                {dashboard.streak.maximum > 0 && (
                  <span className="text-xs text-neutral-text-muted">
                    mejor: {dashboard.streak.maximum}
                  </span>
                )}
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
              <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                <StatCard
                  icon={<CheckCircle className="h-5 w-5 text-brand-primary" />}
                  label="Problemas Resueltos"
                  value={dashboard.problemsSolved}
                  subtitle="total histórico"
                  accent="border-t-brand-primary"
                />
              </div>
              {nextContest ? (
                <Link
                  to={PATHS.contest(nextContest.groupId, nextContest.id)}
                  className="animate-fade-in-up block"
                  style={{ animationDelay: '75ms' }}
                >
                  <StatCard
                    icon={<Clock className="h-5 w-5 text-status-warning" />}
                    label="Próximo Contest"
                    value={getCountdown(nextContest.startDate)}
                    subtitle={nextContest.name}
                    accent="border-t-status-warning"
                  />
                </Link>
              ) : (
                <div className="animate-fade-in-up" style={{ animationDelay: '75ms' }}>
                  <StatCard
                    icon={<Clock className="h-5 w-5 text-status-warning" />}
                    label="Próximo Contest"
                    value="—"
                    subtitle="sin contests próximos"
                    accent="border-t-status-warning"
                  />
                </div>
              )}
              <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                <StatCard
                  icon={<Trophy className="h-5 w-5 text-brand-accent" />}
                  label="Último Resultado"
                  value={lastResult ? `#${lastResult.position}` : '—'}
                  subtitle={lastResult ? `${lastResult.contestName} · ${lastResult.problemsSolved} resueltos` : 'sin contests finalizados'}
                  accent="border-t-brand-accent"
                />
              </div>
              <Link to={ROUTES.GROUPS} className="animate-fade-in-up block" style={{ animationDelay: '225ms' }}>
                <StatCard
                  icon={<FileText className="h-5 w-5 text-status-success" />}
                  label="Materiales Recientes"
                  value={dashboard.materialsCount}
                  subtitle="en los últimos 30 días · ver grupos →"
                  accent="border-t-status-success"
                />
              </Link>
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
                  <>
                    <div className="divide-y divide-neutral-border">
                      {visibleSubmissions.map((sub) => {
                        const statusConfig = SUBMISSION_STATUS_CONFIG[sub.verdict as SubmissionStatus]
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
                              <Link to={PATHS.submission(sub.id)}>
                                <Badge
                                  variant={statusConfig.color === 'success' ? 'default' : 'outline'}
                                  className="hover:opacity-80 transition-opacity"
                                >
                                  {statusConfig.label}
                                </Badge>
                              </Link>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {hasMoreSubmissions && (
                      <Link
                        to={ROUTES.SUBMISSIONS}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline"
                      >
                        Ver más <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </>
                )}
              </Card>

              {/* Mis Contests — 1/3 */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-neutral-text-primary">
                    Mis Contests
                  </h2>
                  {myContests.length > 0 && (
                    <Link
                      to={ROUTES.CONTESTS}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline shrink-0"
                    >
                      Ver todas <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
                {myContests.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <Trophy className="h-8 w-8 text-neutral-border" />
                    <p className="text-sm text-neutral-text-muted">No hay contests en tus grupos.</p>
                    <Link
                      to={ROUTES.GROUPS}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline"
                    >
                      Ver mis grupos <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                    <div className="divide-y divide-neutral-border">
                      {visibleContests.map((contest) => {
                        const urgency = getContestUrgency(contest.startDate)
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
                              {contest.live ? (
                                <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-pill bg-brand-primary text-neutral-text-inverse">
                                  EN VIVO
                                </span>
                              ) : (
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
                              )}
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
  value: string | number
  subtitle?: string
  accent: string
}

function StatCard({ icon, label, value, subtitle, accent }: StatCardProps) {
  return (
    <Card className={cn('p-5 border-t-2 h-full', accent)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold text-neutral-text-primary font-mono">{value}</p>
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
