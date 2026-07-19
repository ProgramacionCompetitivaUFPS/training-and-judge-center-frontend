import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, Building2, Calendar, Mail, Settings } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { useUserProfile, useUserStats } from '@/hooks/api/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/user'

function getInitials(name: string): string {
  const parts = name?.trim().split(/\s+/) ?? []
  return parts.length >= 2
    ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
    : (parts[0]?.charAt(0) ?? '?').toUpperCase()
}

function getAvatarClass(role: UserRole): string {
  if (role === 'ADMIN') return 'bg-brand-primary text-neutral-text-inverse'
  if (role === 'COACH') return 'bg-brand-accent text-neutral-text-inverse'
  return 'bg-neutral-text-primary text-neutral-text-inverse'
}

function getRoleLabel(role: UserRole): string {
  if (role === 'ADMIN') return 'Admin'
  if (role === 'COACH') return 'Coach'
  return 'Contestant'
}

export function ProfilePage() {
  const { nickname } = useParams<{ nickname: string }>()
  const { user: currentUser } = useAuth()

  const isOwnProfile = !nickname || nickname === currentUser?.nickname
  const targetNickname = nickname || currentUser?.nickname || ''

  const { data: profile, isLoading, error } = useUserProfile(targetNickname)
  const { data: stats } = useUserStats(isOwnProfile)

  const acceptanceRate =
    stats && stats.totalSubmissions > 0
      ? Math.round((stats.acceptedSubmissions / stats.totalSubmissions) * 100)
      : null

  return (
    <AppLayout>
      <div className="space-y-4">
        {isLoading && (
          <Card className="p-6">
            <div className="flex items-start gap-5">
              <Skeleton className="h-14 w-14 rounded-lg shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </Card>
        )}

        {error && (
          <Alert variant="error">No se pudo cargar el perfil del usuario.</Alert>
        )}

        {profile && (
          <>
            {/* Identity bar */}
            <Card className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div
                  className={cn(
                    'h-14 w-14 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 self-start sm:self-auto',
                    getAvatarClass(profile.role)
                  )}
                >
                  {getInitials(profile.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-bold text-neutral-text-primary leading-tight">
                      {profile.name}
                    </h1>
                    <Badge
                      variant={
                        profile.role === 'ADMIN'
                          ? 'default'
                          : profile.role === 'COACH'
                            ? 'primary'
                            : 'outline'
                      }
                    >
                      {getRoleLabel(profile.role)}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-text-muted">@{profile.nickname}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-neutral-text-muted">
                    {profile.institution && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        {profile.institution}
                      </span>
                    )}
                    {isOwnProfile && currentUser?.city && currentUser?.country && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {currentUser.city}, {currentUser.country}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      Miembro desde{' '}
                      {new Date(profile.createdAt).toLocaleDateString('es', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    {isOwnProfile && currentUser?.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {currentUser.email}
                      </span>
                    )}
                  </div>
                </div>

                {isOwnProfile && (
                  <Link to={ROUTES.SETTINGS} className="sm:self-start">
                    <Button variant="ghost" size="sm" className="gap-1.5 w-full sm:w-auto">
                      <Settings className="h-3.5 w-3.5" />
                      Editar perfil
                    </Button>
                  </Link>
                )}
              </div>
            </Card>

            {isOwnProfile && stats && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
                <div className="flex flex-col gap-4 lg:self-start">
                  <StatCard
                    value={stats.ranking.position !== null ? `#${stats.ranking.position}` : '—'}
                    label="Ranking global"
                    sub={`de ${stats.ranking.totalUsers}`}
                  />
                  <StatCard
                    value={String(stats.problemsSolved)}
                    label="Problemas resueltos"
                    sub={`${stats.contestsParticipated} contests`}
                  />
                  <StatCard
                    value={acceptanceRate !== null ? `${acceptanceRate}%` : '—'}
                    label="Tasa de aceptación"
                    sub={
                      stats.totalSubmissions > 0
                        ? `${stats.acceptedSubmissions}/${stats.totalSubmissions}`
                        : 'sin submissions'
                    }
                  />
                </div>
                <TopicChart stats={stats.topicStats} />
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}

function StatCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <Card className="p-5 text-center">
      <p className="text-2xl font-bold font-mono text-neutral-text-primary">{value}</p>
      <p className="text-sm text-neutral-text-muted mt-1">{label}</p>
      {sub && <p className="text-xs text-neutral-text-muted opacity-60 mt-0.5">{sub}</p>}
    </Card>
  )
}

function TopicChart({ stats }: { stats: { tag: string; solved: number }[] }) {
  const [expanded, setExpanded] = useState(false)
  const sorted = [...stats].sort((a, b) => b.solved - a.solved)
  const max = sorted[0]?.solved ?? 1
  const VISIBLE = 10
  const visible = expanded ? sorted : sorted.slice(0, VISIBLE)
  const hidden = sorted.length - VISIBLE

  return (
    <Card className="overflow-hidden h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-border">
        <p className="text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">
          Temáticas resueltas
        </p>
        {stats.length > 0 && (
          <span className="text-xs text-neutral-text-muted">{stats.length} temáticas</span>
        )}
      </div>

      {stats.length === 0 ? (
        <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-neutral-text-muted">Sin tópicos resueltos aún</p>
          <p className="text-xs text-neutral-text-muted opacity-60">
            Resuelve problemas para ver tus estadísticas aquí
          </p>
        </div>
      ) : (
        <>
          <div className="px-5 py-4 space-y-2.5">
            {visible.map(({ tag, solved }) => (
              <div key={tag} className="flex items-center gap-3">
                <span className="text-sm text-neutral-text-muted w-28 shrink-0 truncate capitalize">
                  {tag.replace(/-/g, ' ')}
                </span>
                <div className="flex-1 h-2 bg-neutral-border rounded-pill overflow-hidden">
                  <div
                    className="h-full bg-brand-accent rounded-pill transition-all duration-500"
                    style={{ width: `${(solved / max) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-medium text-neutral-text-primary w-4 text-right shrink-0">
                  {solved}
                </span>
              </div>
            ))}
          </div>
          {hidden > 0 && (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded(e => !e)}
              className="w-full px-5 py-2.5 text-xs font-semibold text-brand-accent border-t border-neutral-border hover:bg-neutral-background transition-colors text-left"
            >
              <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>{' '}
              {expanded ? 'Ver menos' : `Ver ${hidden} tópicos más`}
            </button>
          )}
        </>
      )}
    </Card>
  )
}
