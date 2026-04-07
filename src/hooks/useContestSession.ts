import { useContext } from 'react'
import { ContestSessionContext } from '@/components/layout/ContestSessionProvider'

export function useContestSession() {
  return useContext(ContestSessionContext)
}
