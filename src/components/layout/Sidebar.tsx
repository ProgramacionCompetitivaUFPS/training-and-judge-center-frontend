import { cn } from '@/lib/utils'
import { 
  Home, 
  Code2, 
  Trophy, 
  TrendingUp, 
  MessageSquare, 
  BookOpen,
  Settings,
  X
} from 'lucide-react'
import { Button } from '@/components/ui'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: number
  active?: boolean
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Inicio', href: '#', active: true },
  { icon: Code2, label: 'Problemas', href: '#' },
  { icon: Trophy, label: 'Competencias', href: '#', badge: 2 },
  { icon: TrendingUp, label: 'Ranking', href: '#' },
  { icon: MessageSquare, label: 'Discusiones', href: '#' },
  { icon: BookOpen, label: 'Recursos', href: '#' },
]

const secondaryItems: NavItem[] = [
  { icon: Settings, label: 'Configuración', href: '#' },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay (Mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-text-primary/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-neutral-surface border-r border-neutral-border transition-transform duration-300 md:sticky md:top-16 md:h-[calc(100vh-4rem)]',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-border md:hidden">
            <span className="text-lg font-semibold">Menú</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    item.active
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
                </a>
              )
            })}
          </nav>

          {/* Secondary Navigation */}
          <div className="p-4 border-t border-neutral-border space-y-1">
            {secondaryItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-neutral-text-muted hover:bg-neutral-background hover:text-neutral-text-primary transition-colors"
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </a>
              )
            })}
          </div>

          {/* User Stats (Optional) */}
          <div className="p-4 border-t border-neutral-border bg-neutral-background">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-text-muted">Resueltos</span>
                <span className="font-semibold text-neutral-text-primary">
                  45/150
                </span>
              </div>
              <div className="w-full bg-neutral-border rounded-full h-2">
                <div
                  className="bg-brand-primary h-2 rounded-full"
                  style={{ width: '30%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
