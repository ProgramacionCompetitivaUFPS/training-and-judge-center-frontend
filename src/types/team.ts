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

/** Why a roster member can't be selected: the error code registration would fail with. */
export type MemberIneligibilityReason = 'MEMBER_NOT_IN_GROUP' | 'MEMBER_ALREADY_REGISTERED' | 'MEMBER_IN_ANOTHER_TEAM'

export interface TeamRegistrationEligibility {
  /** The team already has a registration for this contest; it can't be registered again. */
  teamAlreadyRegistered: boolean
  members: Array<{
    id: string
    nickname: string
    eligible: boolean
    reason?: MemberIneligibilityReason
  }>
}

export interface ContestTeamRegistrationsResponse {
  teams: Array<{
    team: { id: string; name: string }
    selectedMembers: Array<{ id: string; nickname: string }>
    registeredAt: string
  }>
  total: number
}
