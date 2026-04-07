import type { PaginationParams } from './api'

// === Team ===

export interface TeamMember {
  id: string
  nickname: string
  joinedAt: string
}

export interface TeamInvitationInvitee {
  id: string
  nickname: string
}

export interface TeamPendingInvitation {
  id: string
  invitee: TeamInvitationInvitee
  invitedBy: { id: string; nickname: string }
  invitedAt: string
}

export interface TeamDetail {
  id: string
  name: string
  createdBy: { id: string; nickname: string }
  createdAt: string
  members: TeamMember[]
  pendingInvitations: TeamPendingInvitation[]
}

// === My Teams ===

export interface MyTeamItem {
  id: string
  name: string
  memberCount: number
  joinedAt: string
  createdAt: string
}

export type MyTeamsParams = PaginationParams

export interface MyTeamsResponse {
  teams: MyTeamItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// === Team Invitations (received) ===

export interface TeamInvitationItem {
  id: string
  team: { id: string; name: string }
  invitedBy: { id: string; nickname: string }
  invitedAt: string
  expiresAt: string | null
}

export interface TeamInvitationsResponse {
  invitations: TeamInvitationItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// === Create Team ===

export interface CreateTeamRequest {
  name: string
}

export interface CreateTeamResponse {
  id: string
  name: string
  createdBy: string
  createdAt: string
  members: TeamMember[]
}

// === Invite Member ===

export interface InviteTeamMemberRequest {
  nickname: string
}

export interface TeamInvitationResponse {
  id: string
  teamId: string
  inviteeUser: { id: string; nickname: string }
  invitedBy: { id: string; nickname: string }
  createdAt: string
}

// === Accept Invitation ===

export interface AcceptInvitationResponse {
  team: TeamDetail
  joinedAt: string
}

// === Contest Team Registration ===

export interface RegisterTeamToContestRequest {
  teamId: string
  selectedMembers: string[]
}

export interface ContestTeamRegistration {
  id: string
  contestId: string
  team: { id: string; name: string }
  selectedMembers: Array<{ id: string; nickname: string }>
  registeredAt: string
}

export interface UpdateTeamRegistrationRequest {
  selectedMembers: string[]
}

export interface ContestTeamRegistrationsResponse {
  teams: Array<{
    team: { id: string; name: string }
    selectedMembers: Array<{ id: string; nickname: string }>
    registeredAt: string
  }>
  total: number
}
