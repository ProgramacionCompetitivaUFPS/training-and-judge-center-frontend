import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Code2 } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to={ROUTES.HOME} className="inline-flex items-center gap-2 mb-6">
            <Code2 className="h-8 w-8 text-brand-primary" />
            <span className="text-2xl font-bold text-neutral-text-primary">Training Center</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-neutral-text-primary">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm text-neutral-text-muted">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
