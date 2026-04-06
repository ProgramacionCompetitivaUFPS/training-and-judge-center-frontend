import type { PaginatedResponse, PaginationParams } from './api'

// === Entidad principal ===

export interface User {
  email: string
  name: string
  nickname: string
  country: string
  city: string
  institution: string
  role: UserRole
  status: UserStatus
  preferences?: UserPreferences
  createdAt: string
  updatedAt?: string
}

export type UserRole = 'ADMIN' | 'COACH' | 'CONTESTANT'
export type UserStatus = 'ACTIVE' | 'DEACTIVATED'

export interface UserPreferences {
  hideGlobalGroup?: boolean
}

// === Perfiles ===

/** Perfil público visible por otros usuarios */
export interface PublicUserProfile {
  name: string
  nickname: string
  institution: string
  role: UserRole
  createdAt: string
}

// === Auth ===

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  nickname: string
  country: string
  city: string
  institution: string
}

// === Update ===

export interface UpdateProfileRequest {
  name: string
  nickname: string
  country: string
  city: string
  institution: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface RequestEmailChangeRequest {
  newEmail: string
  password: string
}

export interface ConfirmEmailChangeRequest {
  code: string
}

// === Password Recovery ===

export interface RecoverPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  email: string
  code: string
  newPassword: string
}

// === Deactivation ===

export interface RequestDeactivationRequest {
  password: string
}

export interface ConfirmDeactivationRequest {
  code: string
}

// === Admin ===

export interface AdminUpdateUserRequest {
  name?: string
  role?: UserRole
  institution?: string
}

export interface AdminUserListParams extends PaginationParams {
  search?: string
  role?: UserRole
  status?: UserStatus
  sortBy?: 'name' | 'nickname' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export type AdminUserListResponse = PaginatedResponse<User>

// === Role Change ===

export interface ChangeUserRoleRequest {
  role: UserRole
}

// === Dashboard ===

export interface UserDashboard {
  totalSubmissions: number
  acceptedSubmissions: number
  problemsSolved: number
  contestsParticipated: number
  recentSubmissions: DashboardSubmission[]
  upcomingContests: DashboardContest[]
}

export interface DashboardSubmission {
  id: string
  problemSlug: string
  problemTitle: string
  status: string
  language: string
  submittedAt: string
}

export interface DashboardContest {
  id: string
  name: string
  startTime: string
  endTime: string
  groupName: string
}
