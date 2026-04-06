import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Home, Code2, Trophy, Users, Settings, X, Send, Shield, UsersRound, BarChart3, FileText, Clock } from 'lucide-react'
import { Button } from '@/components/ui'
import { ROUTES } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { useContestSession } from './ContestSessionProvider'
import { ContestCountdown } from '@/components/features/ContestCountdown'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  icon: React.ElementType
  label: string
  to: string
  badge?: number
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Dashboard', to: ROUTES.DASHBOARD },
  { icon: Code2, label: 'Problemas', to: ROUTES.PROBLEMS },
  { icon: Users, label: 'Grupos', to: ROUTES.GROUPS },
  { icon: Trophy, label: 'Competencias', to: ROUTES.CONTESTS },
  { icon: Send, label: 'Submissions', to: ROUTES.SUBMISSIONS },
  { icon: UsersRound, label: 'Equipos', to: ROUTES.TEAMS },
]

const secondaryItems: NavItem[] = [
  { icon: Settings, label: 'Configuración', to: ROUTES.SETTINGS },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const { hasRole } = useAuth()
  const { contest: activeContest } = useContestSession()

  const adminItems: NavItem[] = hasRole('ADMIN')
    ? [{ icon: Shield, label: 'Usuarios', to: ROUTES.ADMIN_USERS }]
    : []

  const isActive = (to: string) =>
    to === ROUTES.DASHBOARD
      ? location.pathname === ROUTES.DASHBOARD || location.pathname === '/'
      : location.pathname.startsWith(to)

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-text-primary/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-neutral-surface border-r border-neutral-border transition-transform duration-300 md:sticky md:top-16 md:h-[calc(100vh-4rem)]',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-neutral-border md:hidden">
            <span className="text-lg font-semibold">Menú</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {/* Contest Mode */}
            {activeContest && activeContest.status === 'ACTIVE' && (
              <div className="mb-4 pb-4 border-b border-neutral-border space-y-3">
                {/* Contest name + timer */}
                <div className="px-1">
                  <Link
                    to={`/contests/${activeContest.id}`}
                    onClick={onClose}
                    className="text-xs font-semibold text-brand-primary hover:underline uppercase tracking-wider"
                  >
                    {activeContest.name}
                  </Link>
                  <div className="mt-2 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-neutral-text-muted flex-shrink-0" />
                    <ContestCountdown targetTime={activeContest.endTime} className="text-left [&_p]:text-xs [&_p]:mb-0 [&_.font-mono]:text-sm" />
                  </div>
                </div>

                {/* Problem pills */}
                {activeContest.problems.length > 0 && (
                  <div className="px-1">
                    <p className="text-[10px] font-semibold text-neutral-text-muted uppercase tracking-widest mb-1.5">Problemas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeContest.problems.map((p) => {
                        const letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[p.position - 1] || String(p.position)
                        const problemPath = `/contests/${activeContest.id}/problems/${letter}`
                        const isCurrent = location.pathname === problemPath
                        return (
                          <Link
                            key={p.slug}
                            to={problemPath}
                            onClick={onClose}
                            className={cn(
                              'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors',
                              isCurrent
                                ? 'bg-brand-primary text-white'
                                : 'bg-neutral-background text-neutral-text-primary hover:bg-brand-primary-muted hover:text-brand-primary'
                            )}
                            title={p.title}
                          >
                            {letter}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Quick contest links */}
                <div className="space-y-0.5">
                  <Link
                    to={`/contests/${activeContest.id}/standings`}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      location.pathname === `/contests/${activeContest.id}/standings`
                        ? 'bg-brand-primary-muted text-brand-primary'
                        : 'text-neutral-text-muted hover:bg-neutral-background hover:text-neutral-text-primary'
                    )}
                  >
                    <BarChart3 className="h-4 w-4 flex-shrink-0" />
                    <span>Standings</span>
                  </Link>
                  <Link
                    to={`/contests/${activeContest.id}/submissions`}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      location.pathname === `/contests/${activeContest.id}/submissions`
                        ? 'bg-brand-primary-muted text-brand-primary'
                        : 'text-neutral-text-muted hover:bg-neutral-background hover:text-neutral-text-primary'
                    )}
                  >
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span>Envíos</span>
                  </Link>
                </div>
              </div>
            )}

            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-brand-primary-muted text-brand-primary'
                      : 'text-neutral-text-muted hover:bg-neutral-background hover:text-neutral-text-primary'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-pill bg-brand-primary text-neutral-surface">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
            {adminItems.length > 0 && (
              <>
                <div className="pt-4 pb-1 px-3 text-xs font-semibold text-neutral-text-muted uppercase tracking-wider">
                  Admin
                </div>
                {adminItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.to)
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        active
                          ? 'bg-brand-primary-muted text-brand-primary'
                          : 'text-neutral-text-muted hover:bg-neutral-background hover:text-neutral-text-primary'
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </>
            )}
          </nav>

          <div className="p-4 border-t border-neutral-border space-y-1">
            {secondaryItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-neutral-text-muted hover:bg-neutral-background hover:text-neutral-text-primary transition-colors"
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </aside>
    </>
  )
}
