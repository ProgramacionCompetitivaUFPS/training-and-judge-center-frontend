// Generic API types
export type { ApiError, PaginatedResponse, PaginationParams } from './api'

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

// User roles
export type UserRole = 'ADMIN' | 'COACH' | 'CONTESTANT'
export type UserStatus = 'ACTIVE' | 'DEACTIVATED'

// ============================================================
// Legacy types below — kept temporarily for existing components
// Will be replaced module by module (Phases 1-7)
// ============================================================

export interface Problem {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string[]
  description: string
  constraints: string[]
  examples: Example[]
  acceptanceRate: number
  totalSubmissions: number
  totalAccepted: number
}

export interface Example {
  input: string
  output: string
  explanation?: string
}

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

export interface ProblemFilters {
  difficulty?: 'easy' | 'medium' | 'hard'
  category?: string
  status?: 'solved' | 'attempted' | 'unsolved'
  search?: string
}
