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
  RegisterTeamToContestRequest,
  ContestTeamRegistration,
  UpdateTeamRegistrationRequest,
  ContestTeamRegistrationsResponse,
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

export function registerTeamToContest(contestId: string, data: RegisterTeamToContestRequest): Promise<ContestTeamRegistration> {
  return apiClient.post(`/contests/${contestId}/team-registrations`, data)
}

export function updateTeamRegistration(contestId: string, teamId: string, data: UpdateTeamRegistrationRequest): Promise<ContestTeamRegistration> {
  return apiClient.put(`/contests/${contestId}/team-registrations/${teamId}`, data)
}

export function unregisterTeamFromContest(contestId: string, teamId: string): Promise<void> {
  return apiClient.delete(`/contests/${contestId}/team-registrations/${teamId}`)
}

export function getContestTeamRegistrations(contestId: string): Promise<ContestTeamRegistrationsResponse> {
  return apiClient.get(`/contests/${contestId}/team-registrations`)
}
