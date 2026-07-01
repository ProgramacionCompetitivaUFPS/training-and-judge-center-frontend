import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as teamsApi from '@/api/teams'
import type {
  MyTeamsParams,
  CreateTeamRequest,
  InviteTeamMemberRequest,
  UpdateTeamRegistrationRequest,
} from '@/types/team'

// === Query Keys ===

export const teamKeys = {
  all: ['teams'] as const,
  myTeams: (params?: MyTeamsParams) => ['teams', 'mine', params] as const,
  detail: (teamId: string) => ['teams', 'detail', teamId] as const,
  myInvitations: ['teams', 'invitations'] as const,
  contestRegistrations: (groupId: string, contestId: string) =>
    ['teams', 'contest-registrations', groupId, contestId] as const,
}

// === Queries ===

export function useMyTeams(params?: MyTeamsParams) {
  return useQuery({
    queryKey: teamKeys.myTeams(params),
    queryFn: () => teamsApi.getMyTeams(params),
  })
}

export function useTeamDetail(teamId: string) {
  return useQuery({
    queryKey: teamKeys.detail(teamId),
    queryFn: () => teamsApi.getTeamDetail(teamId),
    enabled: !!teamId,
  })
}

export function useMyTeamInvitations() {
  return useQuery({
    queryKey: teamKeys.myInvitations,
    queryFn: () => teamsApi.getMyTeamInvitations(),
  })
}

export function useContestTeamRegistrations(groupId: string, contestId: string) {
  return useQuery({
    queryKey: teamKeys.contestRegistrations(groupId, contestId),
    queryFn: () => teamsApi.getContestTeamRegistrations(groupId, contestId),
    enabled: !!groupId && !!contestId,
  })
}

// === Mutations ===

export function useCreateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTeamRequest) => teamsApi.createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
    },
  })
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: InviteTeamMemberRequest }) =>
      teamsApi.inviteTeamMember(teamId, data),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(teamId) })
    },
  })
}

export function useLeaveTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (teamId: string) => teamsApi.leaveTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
    },
  })
}

export function useAcceptTeamInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => teamsApi.acceptTeamInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
      queryClient.invalidateQueries({ queryKey: teamKeys.myInvitations })
    },
  })
}

export function useRejectTeamInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => teamsApi.rejectTeamInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.myInvitations })
    },
  })
}

export function useRegisterTeamToContest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      groupId,
      contestId,
      teamId,
      selectedMembers,
    }: {
      groupId: string
      contestId: string
      teamId: string
      selectedMembers: string[]
    }) => teamsApi.registerTeamToContest(groupId, contestId, teamId, { selectedMembers }),
    onSuccess: (_, { groupId, contestId }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.contestRegistrations(groupId, contestId) })
    },
  })
}

export function useUpdateTeamRegistration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      groupId,
      contestId,
      teamId,
      data,
    }: {
      groupId: string
      contestId: string
      teamId: string
      data: UpdateTeamRegistrationRequest
    }) => teamsApi.updateTeamRegistration(groupId, contestId, teamId, data),
    onSuccess: (_, { groupId, contestId }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.contestRegistrations(groupId, contestId) })
    },
  })
}

export function useUnregisterTeamFromContest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      groupId,
      contestId,
      teamId,
    }: {
      groupId: string
      contestId: string
      teamId: string
    }) => teamsApi.unregisterTeamFromContest(groupId, contestId, teamId),
    onSuccess: (_, { groupId, contestId }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.contestRegistrations(groupId, contestId) })
    },
  })
}
