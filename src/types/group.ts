import type { PaginationParams } from './api'

// === Entidad principal ===

export type GroupVisibility = 'VISIBLE' | 'NOT_VISIBLE'
export type GroupJoinPolicy = 'INVITE' | 'REQUEST' | 'OPEN'
export type GroupRole = 'LEAD' | 'MEMBER'

export interface Group {
  id: string
  name: string
  description?: string | null
  visibility: GroupVisibility
  joinPolicy: GroupJoinPolicy
  isGlobal: boolean
  createdAt: string
  updatedAt?: string
}

// === List Groups (GET /groups) ===

export interface GroupListItem {
  id: string
  name: string
  description: string | null
  visibility: GroupVisibility
  joinPolicy: GroupJoinPolicy
  isGlobal: boolean
  memberCount: number
  leadCount: number
  contestCount: number
  materialCount: number
  activeContestCount: number
  userRole: GroupRole | null
  createdAt: string
}

export interface GroupListParams extends PaginationParams {
  search?: string
  visibility?: GroupVisibility
  joinPolicy?: GroupJoinPolicy
  hasActiveContests?: boolean
  sortBy?: 'name' | 'createdAt' | 'memberCount'
  order?: 'asc' | 'desc'
}

export interface GroupListResponse {
  groups: GroupListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

// === Group Detail (GET /groups/:id) ===

export interface GroupDetail {
  id: string
  name: string
  description: string | null
  visibility: GroupVisibility
  joinPolicy: GroupJoinPolicy
  isGlobal: boolean
  statistics: GroupStatistics
  leads: GroupLead[]
  userMembership: UserMembership
  createdAt: string
  updatedAt?: string
}

export interface GroupStatistics {
  memberCount: number
  leadCount: number
  contestCount: number
  materialCount: number
  activeContestCount: number
  scheduledContestCount: number
  finishedContestCount: number
}

export interface GroupLead {
  userId: string
  nickname: string
  name: string
}

export interface UserMembership {
  isMember: boolean
  role: GroupRole | null
  joinedAt: string | null
  hasPendingRequest: boolean
  hasPendingInvitation: boolean
}

// === My Groups (GET /users/me/groups) ===

export interface MyGroupItem {
  id: string
  name: string
  description: string | null
  visibility: GroupVisibility
  joinPolicy: GroupJoinPolicy
  isGlobal: boolean
  myRole: GroupRole
  joinedAt: string
  memberCount: number
  contestCount: number
  materialCount: number
  activeContestCount: number
  unreadNotifications: number
}

export interface MyGroupsParams extends PaginationParams {
  role?: GroupRole
  search?: string
  sortBy?: 'name' | 'joinedAt' | 'memberCount'
  order?: 'asc' | 'desc'
}

export interface MyGroupsResponse {
  groups: MyGroupItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

// === Create / Update ===

export interface CreateGroupRequest {
  name: string
  description?: string
  visibility: GroupVisibility
  joinPolicy: GroupJoinPolicy
  initialLeadNicknames?: string[]
  initialMemberNicknames?: string[]
}

export interface UpdateGroupRequest {
  name?: string
  description?: string
  visibility?: GroupVisibility
  joinPolicy?: GroupJoinPolicy
}

// === Delete ===

export interface DeleteGroupRequest {
  confirmationName: string
}

// === Members ===

export interface GroupMember {
  groupId: string
  userId: string
  nickname: string
  name: string
  role: GroupRole
  joinedAt: string
}

export interface AddMemberRequest {
  nickname: string
  role: GroupRole
}

export interface ChangeMemberRoleRequest {
  role: GroupRole
}

// === Join Requests ===

export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface JoinRequest {
  id: string
  groupId: string
  requester: {
    userId: string
    nickname: string
    name: string
  }
  message?: string
  status: JoinRequestStatus
  createdAt: string
}

export interface CreateJoinRequestBody {
  message?: string
}

export interface ProcessJoinRequestBody {
  status: 'APPROVED' | 'REJECTED'
}

// === Invitations ===

export interface CreateInvitationRequest {
  inviteeUserId?: string
  inviteeNickname?: string
  inviteeEmail?: string
}

export interface InvitationResponse {
  id: string
  groupId: string
  inviteeUserId: string
  expiresAt: string
}

export interface InvitationListItem {
  id: string
  groupId: string
  invitee: {
    userId: string
    nickname: string
    email: string
    fullName: string
  }
  expiresAt: string
}

export interface InvitationListResponse {
  invitations: InvitationListItem[]
  pagination: {
    page: number
    size: number
    totalItems: number
    totalPages: number
  }
}
