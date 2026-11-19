import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import * as contestsApi from '@/api/contests'
import { mergeContestUpdate } from '@/lib/contestProblems'
import type {
  ContestDetail,
  ContestListParams,
  CreateContestRequest,
  UpdateContestRequest,
  ContestStatus,
  StandingsParams,
  StandingsPhase,
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
  standingsFilterOptions: (groupId: string, contestId: string) =>
    ['contests', 'standings-filter-options', groupId, contestId] as const,
  submissions: (groupId: string, contestId: string, params?: ContestSubmissionsParams) =>
    ['contests', 'submissions', groupId, contestId, params] as const,
}

// === Queries ===

export function useMyContests(params?: ContestListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: contestKeys.myList(params),
    queryFn: () => contestsApi.getMyContests(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  })
}

export function useContests(groupId: string, params?: ContestListParams) {
  return useQuery({
    queryKey: contestKeys.list(groupId, params),
    queryFn: () => contestsApi.getContests(groupId, params),
    placeholderData: keepPreviousData,
    enabled: !!groupId,
  })
}

// Poll while the cached status is behind the clock (a start or end time already passed but the
// backend still said SCHEDULED/ACTIVE), so the page flips on its own instead of staying on
// "Comienza en 00:00:00". Also covers a client clock slightly ahead of the server's.
const STATUS_CATCH_UP_INTERVAL_MS = 3000

export function useContestDetail(groupId: string, contestId: string) {
  return useQuery({
    queryKey: contestKeys.detail(groupId, contestId),
    queryFn: () => contestsApi.getContest(groupId, contestId),
    enabled: !!groupId && !!contestId,
    refetchInterval: (query) => {
      const contest = query.state.data
      if (!contest) return false
      const now = Date.now()
      const startPassed = contest.status === 'SCHEDULED' && now >= Date.parse(contest.startTime)
      const endPassed = contest.status === 'ACTIVE' && now >= Date.parse(contest.endTime)
      return startPassed || endPassed ? STATUS_CATCH_UP_INTERVAL_MS : false
    },
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

export const STANDINGS_REFETCH_MS = 10_000

/**
 * Intervalo de refresco de los standings. Activa: cada `activeIntervalMs`. Finalizada: cada 10 s solo
 * si se piden filas de post-competencia (pueden llegar envíos tardíos); en cualquier otro caso no refresca.
 */
export function standingsRefetchInterval(
  status: ContestStatus | undefined,
  phase: StandingsPhase | undefined,
  activeIntervalMs: number = STANDINGS_REFETCH_MS,
): number | false {
  if (status === 'ACTIVE') return activeIntervalMs
  if (status === 'FINISHED' && (phase === 'all' || phase === 'postcompetition')) {
    return STANDINGS_REFETCH_MS
  }
  return false
}

export function useStandings(
  groupId: string,
  contestId: string,
  params?: StandingsParams,
  options?: { enabled?: boolean; activeIntervalMs?: number },
) {
  return useQuery({
    queryKey: contestKeys.standings(groupId, contestId, params),
    queryFn: () => contestsApi.getStandings(groupId, contestId, params),
    enabled: !!groupId && !!contestId && (options?.enabled ?? true),
    refetchInterval: (query) =>
      standingsRefetchInterval(
        query.state.data?.contest?.status,
        params?.phase,
        options?.activeIntervalMs,
      ),
  })
}

export function useStandingsFilterOptions(groupId: string, contestId: string) {
  return useQuery({
    queryKey: contestKeys.standingsFilterOptions(groupId, contestId),
    queryFn: () => contestsApi.getStandingsFilterOptions(groupId, contestId),
    enabled: !!groupId && !!contestId,
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
      // The PUT response carries the updated problems, but the GET used to refetch on invalidation is
      // more permission-restricted and can omit problems for some Coaches (see hallazgo #6 del manual).
      // So merge the PUT response into the cached detail (it is partial: problems come with `order` and
      // no limits, and fields like participantCount are missing) instead of replacing it, and mark it
      // merely stale (no immediate refetch) so this edit stays visible; a later full reload still hits GET.
      // Without a cached detail there is nothing to merge into: seed with the response as before.
      queryClient.setQueryData<ContestDetail>(
        contestKeys.detail(groupId, contestId),
        (previous) => mergeContestUpdate(previous, data) ?? (data as ContestDetail),
      )
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
      // Literal prefix, not contestKeys.registrations(groupId, contestId) — that appends a
      // trailing `params: undefined`, which only matches a cached query whose params are
      // ALSO exactly undefined. ContestParticipantsPage always passes a params object, so
      // that call would silently never match it.
      queryClient.invalidateQueries({ queryKey: ['contests', 'registrations', groupId, contestId] })
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
      queryClient.invalidateQueries({ queryKey: ['contests', 'registrations', groupId, contestId] })
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
