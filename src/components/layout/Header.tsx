import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui'
import { Code2, User, Settings, LogOut } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-border bg-neutral-surface/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-surface/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-brand-primary" />
          <span className="text-xl font-bold text-neutral-text-primary">
            Training Center
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-neutral-text-primary hover:text-brand-primary transition-colors">
            Problemas
          </a>
          <a href="#" className="text-sm font-medium text-neutral-text-muted hover:text-brand-primary transition-colors">
            Competencias
          </a>
          <a href="#" className="text-sm font-medium text-neutral-text-muted hover:text-brand-primary transition-colors">
            Ranking
          </a>
          <a href="#" className="text-sm font-medium text-neutral-text-muted hover:text-brand-primary transition-colors">
            Discusiones
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden md:inline">Mi Cuenta</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>usuario@example.com</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Perfil
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
