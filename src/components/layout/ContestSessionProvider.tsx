import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useContestDetail } from '@/hooks/api/useContests'
import type { ContestDetail } from '@/types/contest'

interface ContestSessionValue {
  contestId: string | null
  contest: ContestDetail | undefined
  isLoading: boolean
}

const ContestSessionContext = createContext<ContestSessionValue>({
  contestId: null,
  contest: undefined,
  isLoading: false,
})

/** Extract contest ID from current URL if user is in a contest context */
function useContestIdFromUrl(): string | null {
  const location = useLocation()

  // Match /contests/:id, /contests/:id/standings, /contests/:id/submissions, /contests/:id/problems/:slug
  const contestMatch = location.pathname.match(/^\/contests\/([^/]+)/)
  if (contestMatch) return contestMatch[1]

  return null
}

interface ContestSessionProviderProps {
  children: ReactNode
}

export function ContestSessionProvider({ children }: ContestSessionProviderProps) {
  const contestId = useContestIdFromUrl()
  const { data: contest, isLoading } = useContestDetail(contestId || '')

  const value = useMemo<ContestSessionValue>(
    () => ({ contestId, contest, isLoading }),
    [contestId, contest, isLoading],
  )

  return (
    <ContestSessionContext.Provider value={value}>
      {children}
    </ContestSessionContext.Provider>
  )
}

export function useContestSession(): ContestSessionValue {
  return useContext(ContestSessionContext)
}
