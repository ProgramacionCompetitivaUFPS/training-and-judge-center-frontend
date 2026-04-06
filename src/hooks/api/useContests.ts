import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as contestsApi from '@/api/contests'
import type {
  ContestListParams,
  CreateContestRequest,
  UpdateContestRequest,
  StandingsParams,
  ContestSubmissionsParams,
  StandingsResponse,
  AddContestProblemRequest,
} from '@/types/contest'

// === Query Keys ===

export const contestKeys = {
  all: ['contests'] as const,
  list: (groupId: string, params?: ContestListParams) =>
    ['contests', 'list', groupId, params] as const,
  detail: (contestId: string) => ['contests', 'detail', contestId] as const,
  registrationStatus: (groupId: string, contestId: string) =>
    ['contests', 'registration', groupId, contestId] as const,
  registrations: (groupId: string, contestId: string, params?: { page?: number; limit?: number }) =>
    ['contests', 'registrations', groupId, contestId, params] as const,
  standings: (contestId: string, params?: StandingsParams) =>
    ['contests', 'standings', contestId, params] as const,
  submissions: (groupId: string, contestId: string, params?: ContestSubmissionsParams) =>
    ['contests', 'submissions', groupId, contestId, params] as const,
  standingsStream: (contestId: string) =>
    ['contests', 'standingsStream', contestId] as const,
}

// === Queries ===

export function useContests(groupId: string, params?: ContestListParams) {
  return useQuery({
    queryKey: contestKeys.list(groupId, params),
    queryFn: () => contestsApi.getContests(groupId, params),
    enabled: !!groupId,
  })
}

export function useContestDetail(contestId: string) {
  return useQuery({
    queryKey: contestKeys.detail(contestId),
    queryFn: () => contestsApi.getContest(contestId),
    enabled: !!contestId,
  })
}

export function useRegistrationStatus(groupId: string, contestId: string) {
  return useQuery({
    queryKey: contestKeys.registrationStatus(groupId, contestId),
    queryFn: () => contestsApi.getRegistrationStatus(groupId, contestId),
    enabled: !!groupId && !!contestId,
  })
}

export function useRegistrations(
  groupId: string,
  contestId: string,
  params?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: contestKeys.registrations(groupId, contestId, params),
    queryFn: () => contestsApi.getRegistrations(groupId, contestId, params),
    enabled: !!groupId && !!contestId,
  })
}

export function useStandings(contestId: string, params?: StandingsParams) {
  return useQuery({
    queryKey: contestKeys.standings(contestId, params),
    queryFn: () => contestsApi.getStandings(contestId, params),
    enabled: !!contestId,
    refetchInterval: (query) => {
      const status = query.state.data?.contest?.status
      return status === 'ACTIVE' ? 30_000 : false
    },
  })
}

export function useContestSubmissions(
  groupId: string,
  contestId: string,
  params?: ContestSubmissionsParams,
) {
  return useQuery({
    queryKey: contestKeys.submissions(groupId, contestId, params),
    queryFn: () => contestsApi.getContestSubmissions(groupId, contestId, params),
    enabled: !!groupId && !!contestId,
    refetchInterval: (query) => {
      const status = query.state.data?.contest?.status
      return status === 'ACTIVE' ? 15_000 : false
    },
  })
}

// === Mutations ===

export function useCreateContest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: CreateContestRequest }) =>
      contestsApi.createContest(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contestKeys.all })
    },
  })
}

export function useUpdateContest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      groupId,
      contestId,
      data,
    }: {
      groupId: string
      contestId: string
      data: UpdateContestRequest
    }) => contestsApi.updateContest(groupId, contestId, data),
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: contestKeys.detail(contestId) })
      queryClient.invalidateQueries({ queryKey: contestKeys.all })
    },
  })
}

export function useDeleteContest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, contestId }: { groupId: string; contestId: string }) =>
      contestsApi.deleteContest(groupId, contestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contestKeys.all })
    },
  })
}

export function useRegisterToContest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, contestId }: { groupId: string; contestId: string }) =>
      contestsApi.registerToContest(groupId, contestId),
    onSuccess: (_, { groupId, contestId }) => {
      queryClient.invalidateQueries({ queryKey: contestKeys.registrationStatus(groupId, contestId) })
      queryClient.invalidateQueries({ queryKey: contestKeys.detail(contestId) })
    },
  })
}

export function useUnregisterFromContest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, contestId }: { groupId: string; contestId: string }) =>
      contestsApi.unregisterFromContest(groupId, contestId),
    onSuccess: (_, { groupId, contestId }) => {
      queryClient.invalidateQueries({ queryKey: contestKeys.registrationStatus(groupId, contestId) })
      queryClient.invalidateQueries({ queryKey: contestKeys.detail(contestId) })
    },
  })
}

// === Lock / Unlock ===

export function useLockContest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, contestId }: { groupId: string; contestId: string }) =>
      contestsApi.lockContest(groupId, contestId),
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: contestKeys.detail(contestId) })
    },
  })
}

export function useUnlockContest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, contestId }: { groupId: string; contestId: string }) =>
      contestsApi.unlockContest(groupId, contestId),
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: contestKeys.detail(contestId) })
    },
  })
}

// === Contest Problem Management ===

export function useAddContestProblem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      groupId,
      contestId,
      data,
    }: {
      groupId: string
      contestId: string
      data: AddContestProblemRequest
    }) => contestsApi.addContestProblem(groupId, contestId, data),
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: contestKeys.detail(contestId) })
    },
  })
}

export function useRemoveContestProblem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      groupId,
      contestId,
      problemSlug,
    }: {
      groupId: string
      contestId: string
      problemSlug: string
    }) => contestsApi.removeContestProblem(groupId, contestId, problemSlug),
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: contestKeys.detail(contestId) })
    },
  })
}

// === Rejudge ===

export function useRejudgeContestProblem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      groupId,
      contestId,
      problemSlug,
    }: {
      groupId: string
      contestId: string
      problemSlug: string
    }) => contestsApi.rejudgeContestProblem(groupId, contestId, problemSlug),
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: contestKeys.detail(contestId) })
    },
  })
}

// === SSE ===

export function useStandingsStream(contestId: string, enabled = false) {
  const [standings, setStandings] = useState<StandingsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const close = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled || !contestId) {
      close()
      return
    }

    const connect = () => {
      const es = contestsApi.getStandingsStream(contestId)
      eventSourceRef.current = es

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StandingsResponse
          setStandings(data)
          setError(null)
        } catch {
          // ignore parse errors
        }
      }

      es.onerror = () => {
        es.close()
        setError('Connection lost. Reconnecting...')
        // Auto-reconnect after 5 seconds
        setTimeout(() => {
          if (enabled) {
            connect()
          }
        }, 5000)
      }
    }

    connect()

    return () => {
      close()
    }
  }, [contestId, enabled, close])

  return { standings, error, close }
}
