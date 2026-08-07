import type { PaginationParams } from './api'

// === Entidad principal ===

export interface User {
  id?: string
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
  deactivatedAt?: string
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
  email?: string
  nickname?: string
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

export interface AdminUserListResponse {
  users: (User & { id: string })[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

// === Dashboard ===

export interface UserDashboard {
  recentSubmissions: DashboardSubmission[]
  upcomingContests: DashboardContest[]
  activeContests: DashboardContest[]
  problemsSolved: number
  materialsCount: number
  streak: UserStreak
  recentContestResults: DashboardContestResult[]
}

export interface DashboardSubmission {
  id: string
  problemSlug: string
  problemTitle: string
  verdict: string
  language: string
  submittedAt: string
  executionTime: number | null
  memoryKb: number | null
}

export interface DashboardContest {
  id: string
  name: string
  startDate: string
  durationMinutes: number
  groupId: string
  groupName: string
}

export interface DashboardContestResult {
  contestId: string
  contestName: string
  position: number
  problemsSolved: number
  penalty: number
}

export interface UserStreak {
  current: number
  maximum: number
}

// === Profile Statistics ===

export interface UserProfileStats {
  problemsSolved: number
  totalSubmissions: number
  acceptedSubmissions: number
  contestsParticipated: number
  ranking: UserRanking
  topicStats: TopicStat[]
}

export interface UserRanking {
  position: number | null
  totalUsers: number
}

export interface TopicStat {
  tag: string
  solved: number
}
