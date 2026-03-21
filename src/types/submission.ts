import type { PaginationParams } from './api'

// === Submission Status ===

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

export type SubmissionVisibility = 'PUBLIC' | 'PRIVATE'

export type SubmissionLanguage = 'cpp20' | 'java17' | 'python310'
export type SubmissionCompiler = 'g++' | 'javac' | 'py'

// === Submission Detail (GET /submissions/:id) ===

export interface SubmissionDetail {
  id: string
  status: SubmissionStatus
  visibility: SubmissionVisibility
  submittedAt: string
  judgedAt: string | null
  problem: {
    slug: string
    title: string
  }
  contest: {
    id: string
    name: string
  } | null
  submittedBy: {
    id: string
    nickname: string
  }
  language: SubmissionLanguage
  compiler: SubmissionCompiler
  executionTime: number | null
  memoryUsed: number | null
  sourceCode: string
}

// === Submission List Item (no source code) ===

export interface SubmissionListItem {
  id: string
  status: SubmissionStatus
  visibility: SubmissionVisibility
  submittedAt: string
  problem: {
    slug: string
    title: string
  }
  contest: {
    id: string
    name: string
  } | null
  submittedBy: {
    id: string
    nickname: string
  }
  language: SubmissionLanguage
  executionTime: number | null
  memoryUsed: number | null
}

// === My Submissions List (GET /users/me/submissions) ===

export interface MySubmissionsParams extends PaginationParams {
  verdict?: SubmissionStatus
  problemSlug?: string
  language?: SubmissionLanguage
  from?: string
  to?: string
  sort?: string
}

export interface SubmissionListResponse {
  submissions: SubmissionListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

// === Problem Submissions (GET /problems/:slug/submissions) ===

export interface ProblemSubmissionsParams extends PaginationParams {
  verdict?: SubmissionStatus
  language?: SubmissionLanguage
  mine?: boolean
}

// === Submit Solution ===

export interface SubmitSolutionResponse {
  id: string
  status: SubmissionStatus
  submittedAt: string
  problem: {
    slug: string
    title: string
  }
  contest?: {
    id: string
    name: string
  }
  language: SubmissionLanguage
  compiler: SubmissionCompiler
  fileSize: number
  fileHash: string
}

// === Visibility Update ===

export interface UpdateVisibilityRequest {
  visibility: SubmissionVisibility
}

export interface UpdateVisibilityResponse {
  id: string
  visibility: SubmissionVisibility
  message: string
}
