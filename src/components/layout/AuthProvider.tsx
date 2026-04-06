import { useCallback, useMemo, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentUser, userKeys } from '@/hooks/api/useUsers'
import { AuthContext, type AuthContextValue } from '@/hooks/useAuth'
import type { UserRole } from '@/types/user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('auth_token')
  const queryClient = useQueryClient()
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
    localStorage.removeItem('auth_token')
    queryClient.removeQueries({ queryKey: userKeys.me })
    queryClient.clear()
    window.location.href = '/login'
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated, hasRole, logout }),
    [user, isLoading, isAuthenticated, hasRole, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
