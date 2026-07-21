import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui'
import { User, Settings, LogOut, Menu, Search, ChevronRight } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { BreadcrumbItem } from './types'
import tailwindConfig from '../../../tailwind.config.js'

interface NavbarProps {
  onMenuClick: () => void
  showMenuButton?: boolean
  breadcrumbs?: BreadcrumbItem[]
}

const brandColors = tailwindConfig.theme?.extend?.colors as { brand: { primary: string } }
const ripplePathColor = encodeURIComponent(brandColors.brand.primary)

// Textura de "gotas" a escala menor, pensada para una barra de 64px
const NAVBAR_RIPPLE_BG =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='170' height='60' viewBox='0 0 170 60'%3E%3Cg fill='none' stroke='${ripplePathColor}'%3E%3Ccircle cx='34' cy='48' r='7' opacity='0.20'/%3E%3Ccircle cx='34' cy='48' r='15' opacity='0.13'/%3E%3Ccircle cx='34' cy='48' r='24' opacity='0.07'/%3E%3Ccircle cx='128' cy='12' r='6' opacity='0.18'/%3E%3Ccircle cx='128' cy='12' r='13' opacity='0.11'/%3E%3Ccircle cx='128' cy='12' r='21' opacity='0.06'/%3E%3C/g%3E%3C/svg%3E")`

function BellFilled({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a6 6 0 0 0-6 6c0 7-3 9-3 9h18s-3-2-3-9a6 6 0 0 0-6-6z" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function Navbar({ onMenuClick, showMenuButton = true, breadcrumbs }: NavbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault()
    if (!search.trim()) return
    // TODO(backend): ProblemListParams no soporta búsqueda por título todavía.
    // Cuando exista el endpoint, pasar el término como query param real (ej. ?q=search).
    navigate(ROUTES.PROBLEMS)
  }

  return (
    <header
      style={{ backgroundImage: NAVBAR_RIPPLE_BG, backgroundRepeat: 'repeat' }}
      className="sticky top-0 z-40 w-full bg-chrome-navbar border-b border-black/10"
    >
      <div className="flex h-16 items-center px-4 gap-4">
        {showMenuButton && (
          <Button variant="ghost" size="sm" className="md:hidden text-neutral-text-primary hover:bg-black/5" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-neutral-text-muted min-w-0">
          <span className="hidden md:inline">Training Center</span>
          {breadcrumbs?.map((item, i) => {
            const isLast = i === breadcrumbs.length - 1
            return (
              <span key={i} className={cn('flex items-center gap-1 min-w-0', !isLast && 'hidden md:flex')}>
                <ChevronRight className="hidden md:block h-3.5 w-3.5 flex-shrink-0" />
                {item.href && !isLast ? (
                  <Link to={item.href} className="hover:text-neutral-text-primary truncate">{item.label}</Link>
                ) : (
                  <span className={isLast ? 'text-neutral-text-primary font-semibold truncate' : 'truncate'}>{item.label}</span>
                )}
              </span>
            )
          })}
        </nav>

        <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center gap-2 w-56 px-3 py-1.5 rounded-md border border-black/10 bg-white/60 focus-within:border-brand-primary transition-colors">
          <Search className="h-4 w-4 text-neutral-text-muted flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar problema…"
            className="flex-1 bg-transparent text-sm text-neutral-text-primary placeholder:text-neutral-text-muted outline-none min-w-0"
          />
          {/* TODO(frontend): el atajo "/" es solo visual, falta el keydown listener global que enfoque el input */}
          <kbd className="text-[10px] px-1 py-0.5 rounded border border-black/10 text-neutral-text-muted">/</kbd>
        </form>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="sm" className="relative text-neutral-text-muted hover:text-neutral-text-primary hover:bg-black/5">
            <BellFilled className="h-[18px] w-[18px]" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-brand-primary" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md border border-black/10 bg-white/60 px-2.5 py-1.5 text-xs font-mono hover:bg-white transition-colors">
                <span className="h-1.5 w-1.5 rounded-full bg-status-success flex-shrink-0" />
                <span className="font-semibold text-neutral-text-primary">{user?.nickname || 'usuario'}</span>
                <span className="text-neutral-text-muted">@training-center</span>
              </button>
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
