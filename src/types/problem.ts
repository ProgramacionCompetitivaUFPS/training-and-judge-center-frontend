import type { PaginationParams } from './api'

// === Entidad principal ===

export type ProblemStatus = 'DRAFT' | 'PUBLISHED'
export type ProblemAccessibility = 'PUBLIC' | 'PRIVATE'

export interface ProblemAuthor {
  nickname: string
  name: string
}

export interface ProblemModifier {
  nickname: string
  name: string
}

export interface ProblemSolution {
  filename: string
  language: string
}

export interface ProblemFiles {
  testCases: boolean
  solutions: ProblemSolution[]
  checker: boolean
  validator: boolean
}

export interface LanguageOverride {
  language: string
  timeLimit?: number
  memoryLimit?: number
}

// A sample test case pair (data/sample/*.in + *.ans), paired and read from storage by the
// backend (internal/application/problem/samples.go). Empty until test cases are uploaded.
export interface ProblemSample {
  name: string
  input: string
  output: string
}

// === Detalle completo (GET /problems/:slug) ===
// The backend models a problem statement as a single Markdown blob (see problemToDTO /
// getProblemResponse in the backend) — there's no separate inputFormat/outputFormat/examples
// on the wire; that content belongs inside `statement` itself. `samples` is the one exception:
// it's derived automatically from the sample test-case files, not authored by hand.

export interface ProblemDetail {
  slug: string
  title: string
  statement: string | null
  samples: ProblemSample[]
  timeLimit: number | null
  memoryLimit: number | null
  languageOverrides: LanguageOverride[]
  tags: string[]
  status: ProblemStatus
  accessibility: ProblemAccessibility
  author: ProblemAuthor
  modifiers?: ProblemModifier[]
  files?: ProblemFiles
  createdAt: string
  updatedAt: string
  problemJudgingUpdatedAt: string | null
}

// === Listado (GET /problems) ===

export interface ProblemListItem {
  slug: string
  title: string
  tags: string[]
  status: ProblemStatus
  accessibility: ProblemAccessibility
  author: ProblemAuthor
  createdAt: string
  updatedAt: string
}

export interface ProblemListParams extends PaginationParams {
  status?: ProblemStatus
  accessibility?: ProblemAccessibility
  tags?: string
  author?: string
  search?: string
}

export interface ProblemListResponse {
  problems: ProblemListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

// === Create / Update ===

export interface CreateProblemRequest {
  slug: string
  title: string
  statement?: string
  timeLimit?: number
  memoryLimit?: number
  languageOverrides?: LanguageOverride[]
  tags?: string[]
}

export interface UpdateProblemRequest {
  title?: string
  statement?: string
  timeLimit?: number
  memoryLimit?: number
  languageOverrides?: LanguageOverride[]
  tags?: string[]
  accessibility?: ProblemAccessibility
}

// === Delete ===

export interface DeleteProblemRequest {
  confirmSlug: string
}

// === Publish / Unpublish ===

export interface PublishResponse {
  slug: string
  status: ProblemStatus
  message: string
  validationLogs?: string[]
}

export interface UnpublishResponse {
  slug: string
  status: ProblemStatus
  message: string
}

// === Statistics ===

export interface ProblemStatistics {
  totalSubmissions: number
  message?: string
  uniqueUsers?: {
    attempted: number
    solved: number
  }
  acceptanceRateByLanguage?: Array<{
    language: string
    usersAccepted: number
    usersAttempted: number
  }>
  verdictDistribution?: Array<{
    verdict: string
    count: number
  }>
}
