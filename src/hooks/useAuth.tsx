import { createContext, useContext } from 'react'
import type { User, UserRole } from '@/types/user'

export interface AuthContextValue {
  user: User | undefined
  isLoading: boolean
  isAuthenticated: boolean
  hasRole: (role: UserRole | UserRole[]) => boolean
  /** Nickname of the last user who had a session in this tab — survives logout, so the login
   *  redirect can tell whether a pending `from` belongs to whoever signs in next. */
  lastNickname: string | null
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
