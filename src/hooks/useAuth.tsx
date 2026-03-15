import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentUser, userKeys } from '@/hooks/api/useUsers'
import type { User, UserRole } from '@/types/user'

interface AuthContextValue {
  user: User | undefined
  isLoading: boolean
  isAuthenticated: boolean
  hasRole: (role: UserRole | UserRole[]) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
