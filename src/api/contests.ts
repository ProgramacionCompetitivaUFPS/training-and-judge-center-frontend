import { apiClient } from './client'
import type {
  ContestDetail,
  ContestListParams,
  ContestListResponse,
  CreateContestRequest,
  UpdateContestRequest,
  RegistrationStatus,
  RegistrationListResponse,
  StandingsResponse,
  StandingsParams,
  ContestSubmissionsResponse,
  ContestSubmissionsParams,
} from '@/types/contest'

// === CRUD ===

export function getContests(
  groupId: string,
  params?: ContestListParams,
): Promise<ContestListResponse> {
  return apiClient.get(`/groups/${groupId}/contests`, {
    params: params as Record<string, string | number | boolean | undefined>,
  })
}

export function getContest(groupId: string, contestId: string): Promise<ContestDetail> {
  return apiClient.get(`/groups/${groupId}/contests/${contestId}`)
}

export function createContest(
  groupId: string,
  data: CreateContestRequest,
): Promise<ContestDetail> {
  return apiClient.post(`/groups/${groupId}/contests`, data)
}

export function updateContest(
  groupId: string,
  contestId: string,
  data: UpdateContestRequest,
): Promise<ContestDetail> {
  return apiClient.put(`/groups/${groupId}/contests/${contestId}`, data)
}

export function deleteContest(groupId: string, contestId: string): Promise<void> {
  return apiClient.delete(`/groups/${groupId}/contests/${contestId}`)
}

// === Registration ===

export function registerToContest(
  groupId: string,
  contestId: string,
): Promise<void> {
  return apiClient.post(`/groups/${groupId}/contests/${contestId}/register`)
}

export function unregisterFromContest(
  groupId: string,
  contestId: string,
): Promise<void> {
  return apiClient.delete(`/groups/${groupId}/contests/${contestId}/register`)
}

export function getRegistrationStatus(
  groupId: string,
  contestId: string,
): Promise<RegistrationStatus> {
  return apiClient.get(`/groups/${groupId}/contests/${contestId}/register/status`)
}

export function getRegistrations(
  groupId: string,
  contestId: string,
  params?: { page?: number; limit?: number },
): Promise<RegistrationListResponse> {
  return apiClient.get(`/groups/${groupId}/contests/${contestId}/registrations`, {
    params: params as Record<string, string | number | boolean | undefined>,
  })
}

// === Standings ===

export function getStandings(
  groupId: string,
  contestId: string,
  params?: StandingsParams,
): Promise<StandingsResponse> {
  return apiClient.get(`/groups/${groupId}/contests/${contestId}/standings`, {
    params: params as Record<string, string | number | boolean | undefined>,
  })
}

// === Contest Submissions ===

export function getContestSubmissions(
  groupId: string,
  contestId: string,
  params?: ContestSubmissionsParams,
): Promise<ContestSubmissionsResponse> {
  return apiClient.get(`/groups/${groupId}/contests/${contestId}/submissions`, {
    params: params as Record<string, string | number | boolean | undefined>,
  })
}

// === Rejudge ===

export function rejudgeContestProblem(
  groupId: string,
  contestId: string,
  problemSlug: string,
): Promise<void> {
  return apiClient.post(`/groups/${groupId}/contests/${contestId}/problems/${problemSlug}/rejudge`)
}

