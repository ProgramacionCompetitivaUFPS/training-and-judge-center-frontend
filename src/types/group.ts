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
  userRole: GroupRole | null
  createdAt: string
}

export interface GroupListParams extends PaginationParams {
  search?: string
  visibility?: GroupVisibility
  joinPolicy?: GroupJoinPolicy
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

// El backend (GetGroupOutput.Statistics) solo calcula estos dos campos en el
// detalle de un grupo — competencias/materiales se derivan en el frontend a
// partir de sus propios listados (ver GroupDetailPage.tsx).
export interface GroupStatistics {
  memberCount: number
  leadCount: number
}

export interface GroupLead {
  userId: string
  nickname: string
  name: string
}

// El backend (userMembershipResp) no calcula si hay una solicitud o invitación
// pendiente aquí — para eso existe GET .../requests/me (ver useMyJoinRequest).
// Las invitaciones se aceptan solo por el enlace del correo (HU-GRP-09), no hay
// endpoint para "¿tengo una invitación pendiente a este grupo?".
export interface UserMembership {
  isMember: boolean
  role: GroupRole | null
  joinedAt: string | null
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
  userId?: string
  userNickname?: string
  userEmail?: string
}

export interface InvitationInvitee {
  userId: string
  nickname: string
  name: string
  email: string
}

export interface InvitationResponse {
  id: string
  groupId: string
  invitee?: InvitationInvitee
  status: string
  expiresAt: string
  createdAt: string
}

export interface InvitationListItem {
  id: string
  groupId: string
  invitee?: InvitationInvitee
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
