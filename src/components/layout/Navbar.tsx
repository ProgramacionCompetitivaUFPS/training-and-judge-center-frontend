import { Link, useLocation } from 'react-router-dom'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui'
import { Code2, User, Settings, LogOut, Menu, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'

interface NavbarProps {
  onMenuClick: () => void
  showMenuButton?: boolean
}

const navLinks = [
  { label: 'Problemas', to: ROUTES.PROBLEMS },
  { label: 'Grupos', to: ROUTES.GROUPS },
  { label: 'Competencias', to: ROUTES.CONTESTS },
]

export function Navbar({ onMenuClick, showMenuButton = true }: NavbarProps) {
  const location = useLocation()
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full bg-brand-primary shadow-sm">
      <div className="flex h-16 items-center px-4 gap-4">
        {showMenuButton && (
          <Button variant="ghost" size="sm" className="md:hidden text-neutral-text-inverse hover:bg-white/10" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <Link to={ROUTES.HOME} className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-neutral-text-inverse" />
          <span className="text-xl font-bold text-neutral-text-inverse hidden sm:inline">
            Training Center
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'text-sm font-medium transition-colors',
                location.pathname.startsWith(link.to)
                  ? 'text-neutral-text-inverse'
                  : 'text-neutral-text-inverse/70 hover:text-neutral-text-inverse'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="sm" className="relative text-neutral-text-inverse hover:bg-white/10">
            <Bell className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-neutral-text-inverse hover:bg-white/10">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-neutral-text-inverse" />
                </div>
                <span className="hidden md:inline text-sm font-medium">
                  {user?.nickname || 'Usuario'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name || 'Usuario'}</p>
                  <p className="text-xs text-neutral-text-muted">{user?.email || ''}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={ROUTES.PROFILE}><User className="mr-2 h-4 w-4" />Mi Perfil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={ROUTES.SETTINGS}><Settings className="mr-2 h-4 w-4" />Configuración</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-status-error" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
