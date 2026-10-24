import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import { Skeleton } from '@/components/ui/Skeleton'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import type { UserRole } from '@/types/user'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: UserRole[]
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, lastNickname } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Tag `from` with whoever was on this page (logout, expiry, logout from another tab) so the
    // login page doesn't drop a different user onto the previous user's last page.
    return <Navigate to={ROUTES.LOGIN} state={{ from: location, fromNickname: lastNickname }} replace />
  }

  // Same page as a missing route: a role-restricted page shouldn't confirm it exists.
  if (roles && !hasRole(roles)) {
    return <NotFoundPage />
  }

  return <>{children}</>
}
