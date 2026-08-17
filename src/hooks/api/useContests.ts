import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as contestsApi from '@/api/contests'
import type {
  ContestListParams,
  CreateContestRequest,
  UpdateContestRequest,
  StandingsParams,
  ContestSubmissionsParams,
} from '@/types/contest'

// === Query Keys ===

export const contestKeys = {
  all: ['contests'] as const,
  myList: (params?: ContestListParams) =>
    ['contests', 'my-list', params] as const,
  list: (groupId: string, params?: ContestListParams) =>
    ['contests', 'list', groupId, params] as const,
  detail: (groupId: string, contestId: string) =>
    ['contests', 'detail', groupId, contestId] as const,
  registrationStatus: (groupId: string, contestId: string) =>
    ['contests', 'registration', groupId, contestId] as const,
  registrations: (groupId: string, contestId: string, params?: { page?: number; limit?: number }) =>
    ['contests', 'registrations', groupId, contestId, params] as const,
  standings: (groupId: string, contestId: string, params?: StandingsParams) =>
    ['contests', 'standings', groupId, contestId, params] as const,
  submissions: (groupId: string, contestId: string, params?: ContestSubmissionsParams) =>
    ['contests', 'submissions', groupId, contestId, params] as const,
}

// === Queries ===

export function useMyContests(params?: ContestListParams) {
  return useQuery({
    queryKey: contestKeys.myList(params),
    queryFn: () => contestsApi.getMyContests(params),
  })
}

export function useContests(groupId: string, params?: ContestListParams) {
  return useQuery({
    queryKey: contestKeys.list(groupId, params),
    queryFn: () => contestsApi.getContests(groupId, params),
    enabled: !!groupId,
  })
}

export function useContestDetail(groupId: string, contestId: string) {
  return useQuery({
    queryKey: contestKeys.detail(groupId, contestId),
    queryFn: () => contestsApi.getContest(groupId, contestId),
    enabled: !!groupId && !!contestId,
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
  params?: { page?: number; limit?: number; search?: string },
) {
  return useQuery({
    queryKey: contestKeys.registrations(groupId, contestId, params),
    queryFn: () => contestsApi.getRegistrations(groupId, contestId, params),
    enabled: !!groupId && !!contestId,
  })
}

export function useStandings(groupId: string, contestId: string, params?: StandingsParams) {
  return useQuery({
    queryKey: contestKeys.standings(groupId, contestId, params),
    queryFn: () => contestsApi.getStandings(groupId, contestId, params),
    enabled: !!groupId && !!contestId,
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
    onSuccess: (data, { groupId, contestId }) => {
      // The PUT response carries the full updated contest (problems included), but the GET used to
      // refetch on invalidation is more permission-restricted and can omit problems for some Coaches
      // (see hallazgo #6 del manual). Seed the cache with the PUT response directly and mark it merely
      // stale (no immediate refetch) so this edit stays visible; a later full reload still hits GET.
      queryClient.setQueryData(contestKeys.detail(groupId, contestId), data)
      queryClient.invalidateQueries({ queryKey: contestKeys.detail(groupId, contestId), refetchType: 'none' })
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
      queryClient.invalidateQueries({ queryKey: contestKeys.detail(groupId, contestId) })
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
      queryClient.invalidateQueries({ queryKey: contestKeys.detail(groupId, contestId) })
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
    onSuccess: (_, { groupId, contestId }) => {
      queryClient.invalidateQueries({ queryKey: contestKeys.detail(groupId, contestId) })
    },
  })
}
