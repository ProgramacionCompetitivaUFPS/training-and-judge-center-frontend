import { apiClient } from './client'
import type {
  GroupListParams,
  GroupListResponse,
  GroupDetail,
  MyGroupsParams,
  MyGroupsResponse,
  CreateGroupRequest,
  UpdateGroupRequest,
  DeleteGroupRequest,
  Group,
  AddMemberRequest,
  GroupMember,
  ChangeMemberRoleRequest,
  JoinRequest,
  CreateJoinRequestBody,
  ProcessJoinRequestBody,
} from '@/types/group'

// === Groups CRUD ===

export function getGroups(params?: GroupListParams): Promise<GroupListResponse> {
  return apiClient.get('/groups', { params: params as Record<string, string | number | boolean | undefined> })
}

export function getGroupDetail(id: string): Promise<GroupDetail> {
  return apiClient.get(`/groups/${id}`)
}

export function getMyGroups(params?: MyGroupsParams): Promise<MyGroupsResponse> {
  return apiClient.get('/users/me/groups', { params: params as Record<string, string | number | boolean | undefined> })
}

export function createGroup(data: CreateGroupRequest): Promise<Group> {
  return apiClient.post('/groups', data)
}

export function updateGroup(id: string, data: UpdateGroupRequest): Promise<Group> {
  return apiClient.put(`/groups/${id}`, data)
}

export function deleteGroup(id: string, data: DeleteGroupRequest): Promise<void> {
  return apiClient.delete(`/groups/${id}`, { params: { confirmationName: data.confirmationName } })
}

// === Members ===

export function getGroupMembers(groupId: string, params?: { page?: number; limit?: number }): Promise<{ members: GroupMember[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  return apiClient.get(`/groups/${groupId}/members`, { params: params as Record<string, string | number | boolean | undefined> })
}

export function addMember(groupId: string, data: AddMemberRequest): Promise<GroupMember> {
  return apiClient.post(`/groups/${groupId}/members`, data)
}

export function removeMember(groupId: string, nickname: string): Promise<void> {
  return apiClient.delete(`/groups/${groupId}/members/${nickname}`)
}

export function changeMemberRole(groupId: string, nickname: string, data: ChangeMemberRoleRequest): Promise<GroupMember> {
  return apiClient.put(`/groups/${groupId}/members/${nickname}`, data)
}

export function leaveGroup(groupId: string): Promise<void> {
  return apiClient.delete(`/groups/${groupId}/members/me`)
}

// === Join ===

export function joinGroup(groupId: string): Promise<void> {
  return apiClient.post(`/groups/${groupId}/join`)
}

export function createJoinRequest(groupId: string, data?: CreateJoinRequestBody): Promise<JoinRequest> {
  return apiClient.post(`/groups/${groupId}/requests`, data)
}

export function getMyJoinRequest(groupId: string): Promise<JoinRequest> {
  return apiClient.get(`/groups/${groupId}/requests/me`)
}

export function cancelJoinRequest(groupId: string): Promise<void> {
  return apiClient.delete(`/groups/${groupId}/requests/me`)
}

// === Join Requests (Lead) ===

export function getJoinRequests(groupId: string, params?: { status?: string; page?: number; limit?: number }): Promise<{ requests: JoinRequest[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  return apiClient.get(`/groups/${groupId}/requests`, { params: params as Record<string, string | number | boolean | undefined> })
}

export function processJoinRequest(groupId: string, requestId: string, data: ProcessJoinRequestBody): Promise<JoinRequest> {
  return apiClient.put(`/groups/${groupId}/requests/${requestId}`, data)
}

// === Invitations ===

export function createInvitation(groupId: string, data: { inviteeNickname: string }): Promise<{ id: string; groupId: string; expiresAt: string }> {
  return apiClient.post(`/groups/${groupId}/invitations`, data)
}

export function acceptInvitation(groupId: string, token: string): Promise<void> {
  return apiClient.post(`/groups/${groupId}/accept`, null, { params: { token } })
}
