import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as teamsApi from '@/api/teams'
import type {
  MyTeamsParams,
  CreateTeamRequest,
  InviteTeamMemberRequest,
  RegisterTeamToContestRequest,
  UpdateTeamRegistrationRequest,
} from '@/types/team'

// === Query Keys ===

export const teamKeys = {
  all: ['teams'] as const,
  myTeams: (params?: MyTeamsParams) => ['teams', 'mine', params] as const,
  detail: (teamId: string) => ['teams', 'detail', teamId] as const,
  myInvitations: ['teams', 'invitations'] as const,
  contestRegistrations: (contestId: string) => ['teams', 'contest-registrations', contestId] as const,
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

export function useContestTeamRegistrations(contestId: string) {
  return useQuery({
    queryKey: teamKeys.contestRegistrations(contestId),
    queryFn: () => teamsApi.getContestTeamRegistrations(contestId),
    enabled: !!contestId,
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
    mutationFn: ({ contestId, data }: { contestId: string; data: RegisterTeamToContestRequest }) =>
      teamsApi.registerTeamToContest(contestId, data),
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.contestRegistrations(contestId) })
    },
  })
}

export function useUpdateTeamRegistration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ contestId, teamId, data }: { contestId: string; teamId: string; data: UpdateTeamRegistrationRequest }) =>
      teamsApi.updateTeamRegistration(contestId, teamId, data),
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.contestRegistrations(contestId) })
    },
  })
}

export function useUnregisterTeamFromContest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ contestId, teamId }: { contestId: string; teamId: string }) =>
      teamsApi.unregisterTeamFromContest(contestId, teamId),
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.contestRegistrations(contestId) })
    },
  })
}
