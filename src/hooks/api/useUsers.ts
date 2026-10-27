import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import * as usersApi from '@/api/users'
import { setAccessToken, clearAccessToken, notifyLogout, setLoggingOut } from '@/lib/tokenStore'
import type {
  LoginRequest,
  GoogleLoginRequest,
  LinkGoogleRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  SetPasswordRequest,
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
  stats: ['users', 'stats'] as const,
  profile: (nickname: string) => ['users', 'profile', nickname] as const,
  adminList: (params?: AdminUserListParams) => ['users', 'admin', params] as const,
  adminFilterOptions: ['users', 'admin', 'filters'] as const,
  search: (q: string) => ['users', 'search', q] as const,
  soleLeadGroups: (userId: string) => ['users', 'sole-lead-groups', userId] as const,
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

// Caller is expected to debounce `q`. `GET /users/search` allows any authenticated role —
// `canSearch` is just a caller-side gate for skipping the request while some other
// precondition isn't met yet (e.g. the search UI isn't open), not a role check.
export function useSearchUsers(q: string, limit?: number, canSearch = true) {
  return useQuery({
    queryKey: userKeys.search(q),
    queryFn: () => usersApi.searchUsers(q, limit),
    enabled: canSearch && q.trim().length >= 2,
  })
}

export function useUserDashboard(enabled = true) {
  return useQuery({
    queryKey: userKeys.dashboard,
    queryFn: usersApi.getDashboard,
    enabled,
  })
}

export function useUserStats(enabled = true) {
  return useQuery({
    queryKey: userKeys.stats,
    queryFn: usersApi.getProfileStats,
    enabled,
  })
}

export function useAdminUsers(params?: AdminUserListParams) {
  return useQuery({
    queryKey: userKeys.adminList(params),
    queryFn: () => usersApi.adminListUsers(params),
    placeholderData: keepPreviousData,
  })
}

export function useAdminUserFilterOptions() {
  return useQuery({
    queryKey: userKeys.adminFilterOptions,
    queryFn: usersApi.adminGetUserFilterOptions,
  })
}

// === Mutations ===

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: LoginRequest) => usersApi.login(data),
    onSuccess: (response) => {
      setAccessToken(response.token)
      queryClient.setQueryData(userKeys.me, response.user)
      // login response doesn't include googleLinked — refetch to pick it up
      queryClient.invalidateQueries({ queryKey: userKeys.me })
    },
  })
}

export function useGoogleLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: GoogleLoginRequest) => usersApi.googleLogin(data),
    onSuccess: (response) => {
      setAccessToken(response.token)
      queryClient.setQueryData(userKeys.me, response.user)
      queryClient.invalidateQueries({ queryKey: userKeys.me })
    },
  })
}

export function useLinkGoogle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: LinkGoogleRequest) => usersApi.linkGoogleAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me })
    },
  })
}

export function useUnlinkGoogle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => usersApi.unlinkGoogleAccount(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me })
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
      // PUT /users doesn't echo back hasPassword/googleLinked (only GET /users/me does) —
      // merge onto the existing cache instead of replacing it, or those fields revert to undefined.
      queryClient.setQueryData(userKeys.me, (old: typeof updatedUser | undefined) =>
        old ? { ...old, ...updatedUser } : updatedUser
      )
      // ProfilePage reads userKeys.profile(nickname), a sibling key setQueryData above never
      // touches — without this, "Mi Perfil" keeps showing the pre-edit name/institution/etc.
      // until a refresh. Invalidate (not setQueryData) since the response shape differs from
      // what GET /users/:nickname returns.
      queryClient.invalidateQueries({ queryKey: userKeys.profile(updatedUser.nickname) })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => usersApi.changePassword(data),
  })
}

export function useSetPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SetPasswordRequest) => usersApi.setPassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me })
    },
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
      clearAccessToken()
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => usersApi.logout(),
    onMutate: () => {
      setLoggingOut(true)
    },
    onSettled: () => {
      clearAccessToken()
      notifyLogout()
      queryClient.clear()
      setLoggingOut(false)
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

/** Groups where the given user (or me, when userId is omitted) is the only lead. Always fresh. */
export function useSoleLeadGroups(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: userKeys.soleLeadGroups(userId ?? 'me'),
    queryFn: () => (userId ? usersApi.getUserSoleLeadGroups(userId) : usersApi.getMySoleLeadGroups()),
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
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

