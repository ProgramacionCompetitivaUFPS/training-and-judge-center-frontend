import { useState, ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs'
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
    <div className="min-h-screen bg-neutral-background">
      {/* Navbar */}
      <Navbar
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        showMenuButton={showSidebar}
      />

      <div className="flex">
        {/* Sidebar */}
        {showSidebar && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          <div
            className={cn(
              'mx-auto px-4 py-6',
              maxWidthClasses[maxWidth]
            )}
          >
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="mb-6">
                <Breadcrumbs items={breadcrumbs} />
              </div>
            )}

            {/* Page Content */}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
