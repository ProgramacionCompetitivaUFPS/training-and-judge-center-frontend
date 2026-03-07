import { useState } from 'react'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui'
import { Code2, User, Settings, LogOut, Menu, Bell } from 'lucide-react'

interface NavbarProps {
  onMenuClick: () => void
  showMenuButton?: boolean
}

export function Navbar({ onMenuClick, showMenuButton = true }: NavbarProps) {
  const [notifications] = useState(3)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-border bg-neutral-surface/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-surface/60">
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Menu Button (Mobile) */}
        {showMenuButton && (
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Logo */}
        <div className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-brand-primary" />
          <span className="text-xl font-bold text-neutral-text-primary hidden sm:inline">
            Training Center
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 flex-1">
          <a
            href="#"
            className="text-sm font-medium text-neutral-text-primary hover:text-brand-primary transition-colors"
          >
            Problemas
          </a>
          <a
            href="#"
            className="text-sm font-medium text-neutral-text-muted hover:text-brand-primary transition-colors"
          >
            Competencias
          </a>
          <a
            href="#"
            className="text-sm font-medium text-neutral-text-muted hover:text-brand-primary transition-colors"
          >
            Ranking
          </a>
          <a
            href="#"
            className="text-sm font-medium text-neutral-text-muted hover:text-brand-primary transition-colors"
          >
            Discusiones
          </a>
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-brand-primary text-neutral-surface text-xs flex items-center justify-center">
                {notifications}
              </span>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="h-8 w-8 rounded-full bg-brand-primary-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-brand-primary" />
                </div>
                <span className="hidden md:inline text-sm font-medium">
                  Usuario
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Usuario Demo</p>
                  <p className="text-xs text-neutral-text-muted">
                    usuario@example.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-status-error">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
