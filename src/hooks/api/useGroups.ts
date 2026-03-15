import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as groupsApi from '@/api/groups'
import type {
  GroupListParams,
  MyGroupsParams,
  CreateGroupRequest,
  UpdateGroupRequest,
  DeleteGroupRequest,
  AddMemberRequest,
  ChangeMemberRoleRequest,
  CreateJoinRequestBody,
  ProcessJoinRequestBody,
} from '@/types/group'

// === Query Keys ===

export const groupKeys = {
  all: ['groups'] as const,
  list: (params?: GroupListParams) => ['groups', 'list', params] as const,
  detail: (id: string) => ['groups', 'detail', id] as const,
  myGroups: (params?: MyGroupsParams) => ['groups', 'mine', params] as const,
  members: (groupId: string) => ['groups', groupId, 'members'] as const,
  joinRequests: (groupId: string) => ['groups', groupId, 'requests'] as const,
}

// === Queries ===

export function useGroups(params?: GroupListParams) {
  return useQuery({
    queryKey: groupKeys.list(params),
    queryFn: () => groupsApi.getGroups(params),
  })
}

export function useGroupDetail(id: string) {
  return useQuery({
    queryKey: groupKeys.detail(id),
    queryFn: () => groupsApi.getGroupDetail(id),
    enabled: !!id,
  })
}

export function useMyGroups(params?: MyGroupsParams) {
  return useQuery({
    queryKey: groupKeys.myGroups(params),
    queryFn: () => groupsApi.getMyGroups(params),
  })
}

export function useGroupMembers(groupId: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...groupKeys.members(groupId), params],
    queryFn: () => groupsApi.getGroupMembers(groupId, params),
    enabled: !!groupId,
  })
}

export function useJoinRequests(groupId: string, params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...groupKeys.joinRequests(groupId), params],
    queryFn: () => groupsApi.getJoinRequests(groupId, params),
    enabled: !!groupId,
  })
}

// === Mutations ===

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGroupRequest) => groupsApi.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
    },
  })
}

export function useUpdateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGroupRequest }) =>
      groupsApi.updateGroup(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(id) })
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DeleteGroupRequest }) =>
      groupsApi.deleteGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
    },
  })
}

export function useJoinGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => groupsApi.joinGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
    },
  })
}

export function useCreateJoinRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data?: CreateJoinRequestBody }) =>
      groupsApi.createJoinRequest(groupId, data),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) })
    },
  })
}

export function useCancelJoinRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => groupsApi.cancelJoinRequest(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
    },
  })
}

export function useProcessJoinRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, requestId, data }: { groupId: string; requestId: string; data: ProcessJoinRequestBody }) =>
      groupsApi.processJoinRequest(groupId, requestId, data),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.joinRequests(groupId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) })
    },
  })
}

export function useAddMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: AddMemberRequest }) =>
      groupsApi.addMember(groupId, data),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, nickname }: { groupId: string; nickname: string }) =>
      groupsApi.removeMember(groupId, nickname),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) })
    },
  })
}

export function useChangeMemberRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, nickname, data }: { groupId: string; nickname: string; data: ChangeMemberRoleRequest }) =>
      groupsApi.changeMemberRole(groupId, nickname, data),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) })
    },
  })
}

export function useLeaveGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => groupsApi.leaveGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
    },
  })
}

export function useCreateInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, nickname }: { groupId: string; nickname: string }) =>
      groupsApi.createInvitation(groupId, { inviteeNickname: nickname }),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) })
    },
  })
}
