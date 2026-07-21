import { useState, ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { BreadcrumbItem } from './types'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  showSidebar?: boolean
  maxWidth?: 'full' | 'container' | 'narrow'
}

export function AppLayout({
  children,
  breadcrumbs,
  showSidebar = true,
  maxWidth = 'container',
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const maxWidthClasses = {
    full: 'max-w-full',
    container: 'max-w-7xl',
    narrow: 'max-w-4xl',
  }

  return (
    <div className="min-h-screen flex bg-neutral-background">
      {/* Sidebar — de piso a techo, único menú de navegación */}
      {showSidebar && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar — solo utilidades globales, incluye el breadcrumb de la página */}
        <Navbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          showMenuButton={showSidebar}
          breadcrumbs={breadcrumbs}
        />

        {/* Main Content */}
        <main className="flex-1">
          <div
            className={cn(
              'mx-auto px-4 py-6',
              maxWidthClasses[maxWidth]
            )}
          >
            {/* Page Content */}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
