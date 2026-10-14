import { apiClient } from './client'
import type {
  MyTeamsParams,
  MyTeamsResponse,
  TeamDetail,
  CreateTeamRequest,
  CreateTeamResponse,
  InviteTeamMemberRequest,
  TeamInvitationResponse,
  TeamInvitationsResponse,
  AcceptInvitationResponse,
  ContestTeamRegistration,
  UpdateTeamRegistrationRequest,
  ContestTeamRegistrationsResponse,
  TeamRegistrationEligibility,
} from '@/types/team'

// === Teams CRUD ===

export function getMyTeams(params?: MyTeamsParams): Promise<MyTeamsResponse> {
  return apiClient.get('/users/me/teams', { params: params as Record<string, string | number | boolean | undefined> })
}

export function getTeamDetail(teamId: string): Promise<TeamDetail> {
  return apiClient.get(`/teams/${teamId}`)
}

export function createTeam(data: CreateTeamRequest): Promise<CreateTeamResponse> {
  return apiClient.post('/teams', data)
}

// === Members ===

export function inviteTeamMember(teamId: string, data: InviteTeamMemberRequest): Promise<TeamInvitationResponse> {
  return apiClient.post(`/teams/${teamId}/invitations`, data)
}

export function leaveTeam(teamId: string): Promise<void> {
  return apiClient.delete(`/teams/${teamId}/members/me`)
}

export function getTeamMembers(teamId: string): Promise<{ members: Array<{ userId: string; nickname: string; joinedAt: string }> }> {
  return apiClient.get(`/teams/${teamId}/members`)
}

// === Invitations (received) ===

export function getMyTeamInvitations(): Promise<TeamInvitationsResponse> {
  return apiClient.get('/users/me/team-invitations')
}

export function acceptTeamInvitation(invitationId: string): Promise<AcceptInvitationResponse> {
  return apiClient.post(`/team-invitations/${invitationId}/accept`)
}

export function rejectTeamInvitation(invitationId: string): Promise<void> {
  return apiClient.delete(`/team-invitations/${invitationId}`)
}

// === Contest Team Registration ===

export function registerTeamToContest(
  groupId: string,
  contestId: string,
  teamId: string,
  data: { selectedMembers: string[] },
): Promise<ContestTeamRegistration> {
  return apiClient.post(`/groups/${groupId}/contests/${contestId}/team-registrations/${teamId}`, data)
}

export function updateTeamRegistration(
  groupId: string,
  contestId: string,
  teamId: string,
  data: UpdateTeamRegistrationRequest,
): Promise<ContestTeamRegistration> {
  return apiClient.put(`/groups/${groupId}/contests/${contestId}/team-registrations/${teamId}`, data)
}

export function getTeamRegistrationEligibility(
  groupId: string,
  contestId: string,
  teamId: string,
): Promise<TeamRegistrationEligibility> {
  return apiClient.get(`/groups/${groupId}/contests/${contestId}/team-registrations/${teamId}/eligibility`)
}

export function unregisterTeamFromContest(
  groupId: string,
  contestId: string,
  teamId: string,
): Promise<void> {
  return apiClient.delete(`/groups/${groupId}/contests/${contestId}/team-registrations/${teamId}`)
}

// El backend devuelve una forma plana ({items: [{teamId, teamName, ...}], total, page, ...})
// distinta a la que usa el resto del frontend (equipo anidado); se traduce aquí para no
// tener que tocar cada consumidor.
interface RawTeamRegistrationItem {
  id: string
  teamId: string
  teamName: string
  selectedMembers: Array<{ id: string; nickname: string }>
  registeredAt: string
}

interface RawTeamRegistrationsResponse {
  items: RawTeamRegistrationItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getContestTeamRegistrations(
  groupId: string,
  contestId: string,
): Promise<ContestTeamRegistrationsResponse> {
  const raw = await apiClient.get<RawTeamRegistrationsResponse>(
    `/groups/${groupId}/contests/${contestId}/team-registrations`,
  )
  return {
    teams: raw.items.map((item) => ({
      team: { id: item.teamId, name: item.teamName },
      selectedMembers: item.selectedMembers,
      registeredAt: item.registeredAt,
    })),
    total: raw.total,
  }
}
