import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useCurrentUser, useLogout } from '@/hooks/api/useUsers'
import { AuthContext, type AuthContextValue } from '@/hooks/useAuth'
import { getAccessToken, setAccessToken, subscribe, subscribeSessionExpired } from '@/lib/tokenStore'
import { refreshSession } from '@/api/users'
import { ROUTES } from '@/lib/constants'
import { useToastContext } from '@/hooks/useToastContext'
import type { UserRole } from '@/types/user'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const token = useSyncExternalStore(subscribe, getAccessToken)
  const [bootstrapping, setBootstrapping] = useState(true)
  const logoutMutation = useLogout()
  const { toast } = useToastContext()

  useEffect(() => {
    let cancelled = false
    refreshSession()
      .then((res) => {
        if (!cancelled) setAccessToken(res.token)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBootstrapping(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return subscribeSessionExpired(() => {
      toast({
        variant: 'error',
        title: 'Sesión expirada',
        description: 'Tu sesión expiró. Inicia sesión de nuevo para continuar.',
      })
    })
  }, [toast])

  const { data: user, isLoading } = useCurrentUser(!!token)

  const isAuthenticated = !!user && !!token

  const hasRole = useCallback(
    (role: UserRole | UserRole[]) => {
      if (!user) return false
      const roles = Array.isArray(role) ? role : [role]
      return roles.includes(user.role)
    },
    [user],
  )

  const logout = useCallback(() => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        window.location.href = ROUTES.LOGIN
      },
    })
  }, [logoutMutation])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading: bootstrapping || isLoading, isAuthenticated, hasRole, logout }),
    [user, isLoading, bootstrapping, isAuthenticated, hasRole, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
