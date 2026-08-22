import { apiClient } from './client'
import type {
  User,
  LoginRequest,
  LoginResponse,
  RefreshSessionResponse,
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
  AdminUserListResponse,
  PublicUserProfile,
  UserDashboard,
  UserProfileStats,
  UserSearchResponse,
} from '@/types/user'

// === Auth ===

export function register(data: RegisterRequest): Promise<User> {
  return apiClient.post('/users', data)
}

// Orphan endpoint decision: kept as auth infrastructure — required for user authentication flow
export function login(data: LoginRequest): Promise<LoginResponse> {
  return apiClient.post('/auth/login', data)
}

export function googleLogin(data: GoogleLoginRequest): Promise<LoginResponse> {
  return apiClient.post('/auth/google', data)
}

export function refreshSession(): Promise<RefreshSessionResponse> {
  return apiClient.post('/auth/refresh')
}

export function logout(): Promise<void> {
  return apiClient.post('/auth/logout')
}

export function linkGoogleAccount(data: LinkGoogleRequest): Promise<void> {
  return apiClient.post('/users/google', data)
}

export function unlinkGoogleAccount(): Promise<void> {
  return apiClient.delete('/users/google')
}

// === Profile ===

export function getMe(): Promise<User> {
  return apiClient.get('/users/me')
}

export function getUserByNickname(nickname: string): Promise<PublicUserProfile> {
  return apiClient.get(`/users/${nickname}`)
}

export function searchUsers(q: string, limit?: number): Promise<UserSearchResponse> {
  return apiClient.get('/users/search', { params: { q, limit } })
}

export function updateProfile(data: UpdateProfileRequest): Promise<User> {
  return apiClient.put('/users', data)
}

// === Password ===

export function changePassword(data: ChangePasswordRequest): Promise<void> {
  return apiClient.put('/users/password', data)
}

export function setPassword(data: SetPasswordRequest): Promise<void> {
  return apiClient.post('/users/password', data)
}

export function recoverPassword(data: RecoverPasswordRequest): Promise<void> {
  return apiClient.post('/password/forgot', data)
}

export function resetPassword(data: ResetPasswordRequest): Promise<void> {
  return apiClient.post('/password/reset', data)
}

// === Email Change ===

export function requestEmailChange(data: RequestEmailChangeRequest): Promise<void> {
  return apiClient.post('/users/email-change/request', data)
}

export function confirmEmailChange(data: ConfirmEmailChangeRequest): Promise<void> {
  return apiClient.post('/users/email-change/confirm', data)
}

// === Deactivation ===

export function requestDeactivation(data: RequestDeactivationRequest): Promise<void> {
  return apiClient.post('/users/deactivation', data)
}

export function confirmDeactivation(data: ConfirmDeactivationRequest): Promise<void> {
  return apiClient.post('/users/deactivation/confirm', data)
}

// === Admin ===

export function adminListUsers(params?: AdminUserListParams): Promise<AdminUserListResponse> {
  const { search, sortBy, sortOrder, ...rest } = params ?? {}
  return apiClient.get('/admin/users', {
    params: {
      ...rest,
      searchTerm: search,
      sort: sortBy,
      order: sortOrder,
    } as Record<string, string | number | boolean | undefined>,
  })
}

export function adminUpdateUser(id: string, data: AdminUpdateUserRequest): Promise<User> {
  return apiClient.put(`/admin/users/${id}`, data)
}

export function adminDeactivateUser(id: string): Promise<void> {
  return apiClient.post(`/admin/users/${id}/deactivate`)
}

// === Dashboard ===

export function getDashboard(): Promise<UserDashboard> {
  return apiClient.get('/users/me/dashboard')
}

export function getProfileStats(): Promise<UserProfileStats> {
  return apiClient.get('/users/me/stats')
}
