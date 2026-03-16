import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as usersApi from '@/api/users'
import type {
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  RequestEmailChangeRequest,
  ConfirmEmailChangeRequest,
  RecoverPasswordRequest,
  ResetPasswordRequest,
  RequestDeactivationRequest,
  ConfirmDeactivationRequest,
  AdminUpdateUserRequest,
  AdminUserListParams,
} from '@/types/user'

// === Query Keys ===

export const userKeys = {
  all: ['users'] as const,
  me: ['users', 'me'] as const,
  dashboard: ['users', 'dashboard'] as const,
  profile: (nickname: string) => ['users', 'profile', nickname] as const,
  adminList: (params?: AdminUserListParams) => ['users', 'admin', params] as const,
}

// === Queries ===

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: usersApi.getMe,
    enabled,
    retry: false,
  })
}

export function useUserProfile(nickname: string) {
  return useQuery({
    queryKey: userKeys.profile(nickname),
    queryFn: () => usersApi.getUserByNickname(nickname),
    enabled: !!nickname,
  })
}

export function useUserDashboard() {
  return useQuery({
    queryKey: userKeys.dashboard,
    queryFn: usersApi.getDashboard,
  })
}

export function useAdminUsers(params?: AdminUserListParams) {
  return useQuery({
    queryKey: userKeys.adminList(params),
    queryFn: () => usersApi.adminListUsers(params),
  })
}

// === Mutations ===

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: LoginRequest) => usersApi.login(data),
    onSuccess: (response) => {
      localStorage.setItem('auth_token', response.token)
      queryClient.setQueryData(userKeys.me, response.user)
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) => usersApi.register(data),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => usersApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(userKeys.me, updatedUser)
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => usersApi.changePassword(data),
  })
}

export function useRequestEmailChange() {
  return useMutation({
    mutationFn: (data: RequestEmailChangeRequest) => usersApi.requestEmailChange(data),
  })
}

export function useConfirmEmailChange() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ConfirmEmailChangeRequest) => usersApi.confirmEmailChange(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me })
    },
  })
}

export function useRecoverPassword() {
  return useMutation({
    mutationFn: (data: RecoverPasswordRequest) => usersApi.recoverPassword(data),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => usersApi.resetPassword(data),
  })
}

export function useRequestDeactivation() {
  return useMutation({
    mutationFn: (data: RequestDeactivationRequest) => usersApi.requestDeactivation(data),
  })
}

export function useConfirmDeactivation() {
  return useMutation({
    mutationFn: (data: ConfirmDeactivationRequest) => usersApi.confirmDeactivation(data),
    onSuccess: () => {
      localStorage.removeItem('auth_token')
    },
  })
}

export function useAdminUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminUpdateUserRequest }) =>
      usersApi.adminUpdateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useAdminDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.adminDeactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}
