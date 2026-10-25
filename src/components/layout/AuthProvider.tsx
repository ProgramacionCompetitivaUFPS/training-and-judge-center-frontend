import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentUser, useLogout } from '@/hooks/api/useUsers'
import { AuthContext, type AuthContextValue } from '@/hooks/useAuth'
import { getAccessToken, setAccessToken, subscribe, subscribeSessionExpired } from '@/lib/tokenStore'
import { refreshSession } from '@/api/users'
import { ApiClientError } from '@/lib/errors'
import { ROUTES } from '@/lib/constants'
import { useToastContext } from '@/hooks/useToastContext'
import type { UserRole } from '@/types/user'

interface AuthProviderProps {
  children: ReactNode
}

async function refreshWithRetry(isCancelled: () => boolean, maxAttempts = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (isCancelled()) return null
    try {
      const res = await refreshSession()
      return res.token
    } catch (err) {
      const transient = !(err instanceof ApiClientError) || err.status >= 500
      if (!transient) return null
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, attempt * 500))
      }
    }
  }
  return null
}

export function AuthProvider({ children }: AuthProviderProps) {
  const token = useSyncExternalStore(subscribe, getAccessToken)
  const [bootstrapping, setBootstrapping] = useState(true)
  const logoutMutation = useLogout()
  const { toast } = useToastContext()
  const queryClient = useQueryClient()
  const previousTokenRef = useRef(token)

  useEffect(() => {
    if (previousTokenRef.current && !token) {
      queryClient.clear()
    }
    previousTokenRef.current = token
  }, [token, queryClient])

  useEffect(() => {
    let cancelled = false
    refreshWithRetry(() => cancelled).then((token) => {
      if (cancelled) return
      if (token) setAccessToken(token)
      setBootstrapping(false)
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

  const [lastNickname, setLastNickname] = useState<string | null>(null)
  if (user?.nickname && user.nickname !== lastNickname) {
    setLastNickname(user.nickname)
  }

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
    () => ({ user, isLoading: bootstrapping || isLoading, isAuthenticated, hasRole, logout, lastNickname }),
    [user, isLoading, bootstrapping, isAuthenticated, hasRole, logout, lastNickname],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
