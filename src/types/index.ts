// Generic API types
export type { ApiError, PaginatedResponse, PaginationParams } from './api'

// User types (new, from user.ts)
export type {
  UserRole,
  UserStatus,
  PublicUserProfile,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  AdminUserListParams,
  AdminUserListResponse,
  UserDashboard,
} from './user'

// Problem types
export type {
  ProblemStatus,
  ProblemAccessibility,
  ProblemAuthor,
  ProblemModifier,
  ProblemFiles,
  LanguageOverride,
  ProblemDetail,
  ProblemListItem,
  ProblemListParams,
  ProblemListResponse,
  CreateProblemRequest,
  UpdateProblemRequest,
  DeleteProblemRequest,
  PublishResponse,
  UnpublishResponse,
  ProblemStatistics,
} from './problem'

// Group types
export type {
  GroupVisibility,
  GroupJoinPolicy,
  GroupRole,
  Group,
  GroupListItem,
  GroupListParams,
  GroupListResponse,
  GroupDetail,
  GroupStatistics,
  GroupLead,
  UserMembership,
  MyGroupItem,
  MyGroupsParams,
  MyGroupsResponse,
  CreateGroupRequest,
  UpdateGroupRequest,
  DeleteGroupRequest,
  GroupMember,
  AddMemberRequest,
  ChangeMemberRoleRequest,
  JoinRequestStatus,
  JoinRequest,
  CreateJoinRequestBody,
  ProcessJoinRequestBody,
  CreateInvitationRequest,
  InvitationResponse,
  InvitationListItem,
  InvitationListResponse,
} from './group'

// Submission status (used across modules)
export type SubmissionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'RUNTIME_EXCEPTION'
  | 'COMPILATION_ERROR'
  | 'PRESENTATION_ERROR'
  | 'SYSTEM_ERROR'

// ============================================================
// Legacy types below — kept temporarily for existing components
// Will be replaced module by module (Phases 4-7)
// ============================================================

export interface Submission {
  id: string
  problemId: string
  userId: string
  code: string
  language: string
  status: SubmissionStatus
  runtime?: number
  memory?: number
  timestamp: Date
  testCasesPassed?: number
  totalTestCases?: number
}

export interface User {
  id: string
  username: string
  email: string
  avatar?: string
  solvedProblems: number
  totalSubmissions: number
  rank?: number
}
