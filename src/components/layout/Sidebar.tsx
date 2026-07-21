import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Home, Code2, Trophy, Users, Settings, X, Send, Shield, UsersRound, BarChart3, FileText, Clock } from 'lucide-react'
import { Button } from '@/components/ui'
import { ROUTES, PATHS } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { useContestSession } from '@/hooks/useContestSession'
import { ContestCountdown } from '@/components/features/ContestCountdown'

// Textura de "gotas" (anillos concéntricos) en bajo contraste sobre el chrome del sidebar
const SIDEBAR_RIPPLE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Cg fill='none' stroke='%23ffffff'%3E%3Ccircle cx='50' cy='46' r='16' opacity='0.16'/%3E%3Ccircle cx='50' cy='46' r='32' opacity='0.11'/%3E%3Ccircle cx='50' cy='46' r='50' opacity='0.07'/%3E%3Ccircle cx='50' cy='46' r='70' opacity='0.03'/%3E%3Ccircle cx='222' cy='82' r='13' opacity='0.15'/%3E%3Ccircle cx='222' cy='82' r='27' opacity='0.10'/%3E%3Ccircle cx='222' cy='82' r='43' opacity='0.06'/%3E%3Ccircle cx='222' cy='82' r='60' opacity='0.03'/%3E%3Ccircle cx='132' cy='192' r='19' opacity='0.16'/%3E%3Ccircle cx='132' cy='192' r='38' opacity='0.11'/%3E%3Ccircle cx='132' cy='192' r='58' opacity='0.06'/%3E%3Ccircle cx='132' cy='192' r='80' opacity='0.03'/%3E%3Ccircle cx='266' cy='256' r='12' opacity='0.14'/%3E%3Ccircle cx='266' cy='256' r='24' opacity='0.09'/%3E%3Ccircle cx='266' cy='256' r='38' opacity='0.05'/%3E%3Ccircle cx='20' cy='254' r='14' opacity='0.15'/%3E%3Ccircle cx='20' cy='254' r='29' opacity='0.10'/%3E%3Ccircle cx='20' cy='254' r='46' opacity='0.06'/%3E%3C/g%3E%3C/svg%3E\")"

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

interface SidebarNavItemProps {
  item: NavItem
  isActive: boolean
  onClose: () => void
}

interface SidebarNavGroupProps {
  label: string
  items: NavItem[]
  isActive: (to: string) => boolean
  onClose: () => void
}

function SidebarNavItem({ item, isActive, onClose }: SidebarNavItemProps) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors',
        isActive
          ? 'bg-white text-chrome-sidebar shadow-sm'
          : 'text-white/80 hover:bg-white/10 hover:text-white'
      )}
    >
      {!isActive && <Icon className="h-5 w-5 flex-shrink-0" />}
      <span className={cn('flex items-center gap-[2px] flex-1', isActive && 'text-base')}>
        {item.label}
        {isActive && (
          <span className="w-[2px] h-[18px] bg-chrome-sidebar animate-caret-blink flex-shrink-0" aria-hidden="true" />
        )}
      </span>
      {item.badge && (
        <span className="px-2 py-0.5 text-xs font-bold rounded-pill bg-status-warning text-white">
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function SidebarNavGroup({ label, items, isActive, onClose }: SidebarNavGroupProps) {
  if (items.length === 0) return null
  return (
    <>
      <div className="pt-4 pb-1 px-3 text-xs font-semibold text-white/60 uppercase tracking-wider">
        {label}
      </div>
      {items.map((item) => (
        <SidebarNavItem
          key={item.to}
          item={item}
          isActive={isActive(item.to)}
          onClose={onClose}
        />
      ))}
    </>
  )
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
        style={{ backgroundImage: SIDEBAR_RIPPLE_BG, backgroundRepeat: 'repeat' }}
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-chrome-sidebar transition-transform duration-300 md:sticky md:top-0 md:h-screen',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 pt-7 pb-5">
            <Link to={ROUTES.HOME} className="flex items-center gap-2 text-white font-bold">
              <Code2 className="h-5 w-5" />
              <span>Training Center</span>
            </Link>
            <Button variant="ghost" size="sm" className="md:hidden text-white hover:bg-white/10" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {/* Contest Mode */}
            {activeContest && activeContest.status === 'ACTIVE' && (
              <div className="mb-4 pb-4 border-b border-white/15 space-y-3">
                {/* Contest name + timer */}
                <div className="px-1">
                  <Link
                    to={PATHS.contest(activeContest.group.id, activeContest.id)}
                    onClick={onClose}
                    className="text-xs font-semibold text-white hover:underline uppercase tracking-wider"
                  >
                    {activeContest.name}
                  </Link>
                  <div className="mt-2 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-white/70 flex-shrink-0" />
                    <ContestCountdown targetTime={activeContest.endTime} className="text-left [&_p]:text-xs [&_p]:mb-0 [&_p]:text-white/70 [&_.font-mono]:text-sm [&_.font-mono]:text-white" />
                  </div>
                </div>

                {/* Problem pills */}
                {activeContest.problems.length > 0 && (
                  <div className="px-1">
                    <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-1.5">Problemas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeContest.problems.map((p) => {
                        const letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[p.position - 1] || String(p.position)
                        const problemPath = PATHS.contestProblem(activeContest.group.id, activeContest.id, letter)
                        const isCurrent = location.pathname === problemPath
                        return (
                          <Link
                            key={p.slug}
                            to={problemPath}
                            onClick={onClose}
                            className={cn(
                              'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors',
                              isCurrent
                                ? 'bg-white text-chrome-sidebar'
                                : 'bg-white/10 text-white hover:bg-white/20'
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
                    to={PATHS.contestStandings(activeContest.group.id, activeContest.id)}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      location.pathname === PATHS.contestStandings(activeContest.group.id, activeContest.id)
                        ? 'bg-white text-chrome-sidebar'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <BarChart3 className="h-4 w-4 flex-shrink-0" />
                    <span>Standings</span>
                  </Link>
                  <Link
                    to={PATHS.contestSubmissions(activeContest.group.id, activeContest.id)}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      location.pathname === PATHS.contestSubmissions(activeContest.group.id, activeContest.id)
                        ? 'bg-white text-chrome-sidebar'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span>Envíos</span>
                  </Link>
                </div>
              </div>
            )}

            {navItems.map((item) => (
              <SidebarNavItem
                key={item.to}
                item={item}
                isActive={isActive(item.to)}
                onClose={onClose}
              />
            ))}

            <SidebarNavGroup
              label="Admin"
              items={adminItems}
              isActive={isActive}
              onClose={onClose}
            />
          </nav>

          <div className="p-4 border-t border-white/15 space-y-1">
            {secondaryItems.map((item) => (
              <SidebarNavItem
                key={item.to}
                item={item}
                isActive={isActive(item.to)}
                onClose={onClose}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}
