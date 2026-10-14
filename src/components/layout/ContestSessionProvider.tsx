import { createContext, useMemo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useContestDetail } from '@/hooks/api/useContests'
import type { ContestDetail } from '@/types/contest'

interface ContestSessionValue {
  contestId: string | null
  groupId: string | null
  contest: ContestDetail | undefined
  isLoading: boolean
}

const ContestSessionContext = createContext<ContestSessionValue>({
  contestId: null,
  groupId: null,
  contest: undefined,
  isLoading: false,
})
export { ContestSessionContext }

/** Extract groupId and contestId from current URL if user is in a contest context */
function useContestParamsFromUrl(): { groupId: string | null; contestId: string | null } {
  const location = useLocation()

  // Match /groups/:groupId/contests/:contestId and sub-paths
  const match = location.pathname.match(/^\/groups\/([^/]+)\/contests\/([^/]+)/)
  if (match) return { groupId: match[1], contestId: match[2] }

  return { groupId: null, contestId: null }
}

interface ContestSessionProviderProps {
  children: ReactNode
}

export function ContestSessionProvider({ children }: ContestSessionProviderProps) {
  const { groupId, contestId } = useContestParamsFromUrl()
  const { data: contest, isLoading } = useContestDetail(groupId || '', contestId || '')

  const value = useMemo<ContestSessionValue>(
    () => ({ contestId, groupId, contest, isLoading }),
    [contestId, groupId, contest, isLoading],
  )

  return (
    <ContestSessionContext.Provider value={value}>
      {children}
    </ContestSessionContext.Provider>
  )
}
