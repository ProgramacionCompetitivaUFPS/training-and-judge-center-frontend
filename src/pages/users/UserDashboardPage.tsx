import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Clock, Trophy, FileText, Send, ArrowRight, Flame } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { StatCard } from '@/components/features/StatCard'
import { useAuth } from '@/hooks/useAuth'
import { useUserDashboard } from '@/hooks/api/useUsers'
import { SUBMISSION_STATUS_CONFIG, ROUTES, PATHS } from '@/lib/constants'
import { cn, pluralize } from '@/lib/utils'
import type { SubmissionStatus, SubmissionOrigin } from '@/types'
import type { DashboardContest, UserDashboard } from '@/types/user'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function getMotivationalLine(upcomingCount: number, activeCount: number): string {
  if (activeCount > 0) return `Tienes ${activeCount} competencia${activeCount > 1 ? 's' : ''} en vivo ahora.`
  if (upcomingCount > 0)
    return `Tienes ${upcomingCount} competencia${upcomingCount > 1 ? 's' : ''} próxima${upcomingCount > 1 ? 's' : ''}.`
  return 'Sigue resolviendo — cada envío cuenta.'
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

// Passed to SubmissionDetailPage so its breadcrumb/"Volver" point back to the dashboard
// instead of the unrelated global "Mis Envíos" list.
const SUBMISSION_ORIGIN: SubmissionOrigin = { backTo: ROUTES.DASHBOARD, backLabel: 'Panel de actividad' }

const PREVIEW_LIMIT = 5

type MyContest = DashboardContest & { live: boolean }

/** Contests running now first, then the upcoming ones by start date. */
function buildMyContests(dashboard: UserDashboard | undefined): MyContest[] {
  const live = dashboard?.activeContests ?? []
  const upcoming = dashboard?.upcomingContests ?? []
  const byStartDate = (a: DashboardContest, b: DashboardContest) =>
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  return [
    ...live.map((c) => ({ ...c, live: true })),
    ...[...upcoming].sort(byStartDate).map((c) => ({ ...c, live: false })),
  ]
}

function streakCaption(current: number): string {
  if (current === 0) return '¡Resuelve hoy para empezar tu racha!'
  return current === 1 ? 'día de racha' : 'días de racha'
}

function StreakBadge({ streak }: Readonly<{ streak: { current: number; maximum: number } }>) {
  return (
    <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2 shrink-0">
      <div className="flex items-center gap-2">
        <Flame className={cn('h-10 w-10', streak.current > 0 ? 'text-brand-accent' : 'text-neutral-border')} />
        <span className="text-2xl font-bold text-neutral-text-primary leading-none">{streak.current}</span>
      </div>
      <div className="flex flex-col items-start">
        <span className="text-xs text-neutral-text-muted">{streakCaption(streak.current)}</span>
        {streak.maximum > 0 && <span className="text-xs text-neutral-text-muted">mejor: {streak.maximum}</span>}
      </div>
    </div>
  )
}

function DashboardHeader({ firstName, dashboard }: Readonly<{ firstName: string; dashboard: UserDashboard | undefined }>) {
  const subtitle = dashboard
    ? getMotivationalLine(dashboard.upcomingContests.length, dashboard.activeContests.length)
    : 'Cargando tu actividad...'
  return (
    <div className="flex items-center justify-between pb-6 border-b border-neutral-border">
      <div>
        <p className="text-xs font-semibold text-brand-primary uppercase tracking-[0.2em] mb-1">{getGreeting()}</p>
        <h1 className="text-4xl font-bold text-neutral-text-primary">{firstName}</h1>
        <p className="text-neutral-text-muted mt-2">{subtitle}</p>
      </div>
      {dashboard?.streak && <StreakBadge streak={dashboard.streak} />}
    </div>
  )
}

function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  )
}

function NextContestCard({ contest }: Readonly<{ contest: DashboardContest | null }>) {
  if (!contest) {
    return (
      <div className="animate-fade-in-up" style={{ animationDelay: '75ms' }}>
        <StatCard
          icon={<Clock className="h-5 w-5 text-status-warning" />}
          label="Próxima Competencia"
          value="—"
          sub="sin competencias próximas"
          accentBorder="border-t-status-warning"
          valueSize="text-3xl"
        />
      </div>
    )
  }
  return (
    <Link to={PATHS.contest(contest.groupId, contest.id)} className="animate-fade-in-up block" style={{ animationDelay: '75ms' }}>
      <StatCard
        icon={<Clock className="h-5 w-5 text-status-warning" />}
        label="Próxima Competencia"
        value={getCountdown(contest.startDate)}
        sub={contest.name}
        accentBorder="border-t-status-warning"
        valueSize="text-3xl"
      />
    </Link>
  )
}

function LastResultCard({ result }: Readonly<{ result: UserDashboard['recentContestResults'][number] | null }>) {
  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
      <StatCard
        icon={<Trophy className="h-5 w-5 text-brand-accent" />}
        label="Último Resultado"
        value={result ? `#${result.position}` : '—'}
        sub={result ? `${result.contestName} · ${pluralize(result.problemsSolved, 'resuelto')}` : 'sin competencias finalizadas'}
        accentBorder="border-t-brand-accent"
        valueSize="text-3xl"
      />
    </div>
  )
}

function StatCards({ dashboard }: Readonly<{ dashboard: UserDashboard }>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <StatCard
          icon={<CheckCircle className="h-5 w-5 text-status-success" />}
          label="Problemas Resueltos"
          value={dashboard.problemsSolved}
          sub="total histórico"
          valueColor="text-status-success"
          accentBorder="border-t-status-success"
          valueSize="text-3xl"
        />
      </div>
      <NextContestCard contest={dashboard.upcomingContests[0] ?? null} />
      <LastResultCard result={dashboard.recentContestResults[0] ?? null} />
      <Link to={ROUTES.GROUPS} className="animate-fade-in-up block" style={{ animationDelay: '225ms' }}>
        <StatCard
          icon={<FileText className="h-5 w-5 text-brand-primary" />}
          label="Materiales Recientes"
          value={dashboard.materialsCount}
          sub="en los últimos 30 días · ver grupos →"
          accentBorder="border-t-brand-primary"
          valueSize="text-3xl"
        />
      </Link>
    </div>
  )
}

interface EmptyListStateProps {
  icon: ReactNode
  message: string
  linkTo: string
  linkLabel: string
}

function EmptyListState({ icon, message, linkTo, linkLabel }: Readonly<EmptyListStateProps>) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      {icon}
      <p className="text-sm text-neutral-text-muted">{message}</p>
      <Link to={linkTo} className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline">
        {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

function RecentSubmissionRow({ sub }: Readonly<{ sub: UserDashboard['recentSubmissions'][number] }>) {
  const statusConfig = SUBMISSION_STATUS_CONFIG[sub.verdict as SubmissionStatus]
  return (
    <div className="flex items-center justify-between py-3 text-sm">
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
        <Link to={PATHS.submission(sub.id)} state={SUBMISSION_ORIGIN}>
          <Badge variant={statusConfig.color === 'success' ? 'default' : 'outline'} className="hover:opacity-80 transition-opacity">
            {statusConfig.label}
          </Badge>
        </Link>
      )}
    </div>
  )
}

function RecentSubmissionsCard({ submissions }: Readonly<{ submissions: UserDashboard['recentSubmissions'] }>) {
  return (
    <Card className="p-6 lg:col-span-2">
      <h2 className="text-base font-semibold text-neutral-text-primary mb-4">Envíos Recientes</h2>
      {submissions.length === 0 ? (
        <EmptyListState
          icon={<Send className="h-8 w-8 text-neutral-border" />}
          message="Aún no tienes envíos."
          linkTo={ROUTES.PROBLEMS}
          linkLabel="Ver problemas"
        />
      ) : (
        <>
          <div className="divide-y divide-neutral-border">
            {submissions.slice(0, PREVIEW_LIMIT).map((sub) => (
              <RecentSubmissionRow key={sub.id} sub={sub} />
            ))}
          </div>
          {submissions.length > PREVIEW_LIMIT && (
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
  )
}

function ContestStartBadge({ contest }: Readonly<{ contest: MyContest }>) {
  if (contest.live) {
    return (
      <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-pill bg-brand-primary text-neutral-text-inverse">
        EN VIVO
      </span>
    )
  }
  const urgency = getContestUrgency(contest.startDate)
  const urgentClasses = 'font-bold px-2 py-0.5 rounded-pill bg-brand-primary text-neutral-text-inverse'
  return <span className={cn('shrink-0 text-xs', urgency.urgent ? urgentClasses : 'text-neutral-text-muted')}>{urgency.label}</span>
}

function MyContestRow({ contest }: Readonly<{ contest: MyContest }>) {
  return (
    <Link to={PATHS.contest(contest.groupId, contest.id)} className="block py-3 group">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-neutral-text-primary group-hover:text-brand-primary transition-colors leading-snug">
          {contest.name}
        </span>
        <ContestStartBadge contest={contest} />
      </div>
      <p className="text-xs text-neutral-text-muted mt-0.5">{contest.groupName}</p>
    </Link>
  )
}

function MyContestsCard({ contests }: Readonly<{ contests: MyContest[] }>) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-neutral-text-primary">Mis Competencias</h2>
        {contests.length > PREVIEW_LIMIT && (
          <Link
            to={ROUTES.CONTESTS}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline shrink-0"
          >
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {contests.length === 0 ? (
        <EmptyListState
          icon={<Trophy className="h-8 w-8 text-neutral-border" />}
          message="No hay competencias en tus grupos."
          linkTo={ROUTES.GROUPS}
          linkLabel="Ver mis grupos"
        />
      ) : (
        <div className="divide-y divide-neutral-border">
          {contests.slice(0, PREVIEW_LIMIT).map((contest) => (
            <MyContestRow key={contest.id} contest={contest} />
          ))}
        </div>
      )}
    </Card>
  )
}

export function UserDashboardPage() {
  const { user } = useAuth()
  const { data: dashboard, isLoading, error } = useUserDashboard()

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard' }]}>
      <div className="space-y-8">
        {/* Header editorial */}
        <DashboardHeader firstName={user?.name?.split(' ')[0] || 'Usuario'} dashboard={dashboard} />

        {error && <Alert variant="error">No se pudo cargar el dashboard.</Alert>}

        {isLoading && <StatCardsSkeleton />}
        {!isLoading && dashboard && (
          <>
            <StatCards dashboard={dashboard} />

            {/* Listas — asimétrico 2/3 + 1/3 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <RecentSubmissionsCard submissions={dashboard.recentSubmissions} />
              <MyContestsCard contests={buildMyContests(dashboard)} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
