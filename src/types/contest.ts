import type { PaginationParams } from './api'

// === Contest Status (computed by time) ===

export type ContestStatus = 'SCHEDULED' | 'ACTIVE' | 'FINISHED'

export type ParticipationMode = 'INDIVIDUAL' | 'TEAM' | 'MIXED'

// === Contest Detail (GET /contests/:id) ===

export interface ContestProblem {
  position: number
  slug: string
  title: string
  timeLimit: number
  memoryLimit: number
}

export interface ContestDetail {
  id: string
  name: string
  description: string | null
  startTime: string
  endTime: string
  duration: number // seconds
  status: ContestStatus
  penalty: number
  freezeMinutes: number | null
  enablePostContest: boolean
  locked?: boolean // only for Leads/Admin
  participantCount: number
  isRegistered: boolean
  participationMode: ParticipationMode
  teamSizeMin?: number
  teamSizeMax?: number
  showTeamMembers: boolean
  group: { id: string; name: string }
  owner: { id: string; nickname: string }
  problems: ContestProblem[]
  problemCount: number
  createdAt: string
  updatedAt: string
}

// === Contest List Item (GET /groups/:groupId/contests and GET /contests) ===

export interface ContestListItem {
  id: string
  name: string
  description: string | null
  startTime: string
  endTime: string
  duration: number
  status: ContestStatus
  penalty: number
  freezeMinutes: number | null
  enablePostContest: boolean
  participantCount: number
  isRegistered: boolean
  problemCount: number
  group?: { id: string; name: string }
}

// === Contest List Params ===

export interface ContestListParams extends PaginationParams {
  status?: ContestStatus
  sortBy?: 'startTime' | 'createdAt' | 'name'
  sortOrder?: 'asc' | 'desc'
}

export interface ContestListResponse {
  data: ContestListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

// === Create Contest ===

export interface CreateContestRequest {
  name: string
  description?: string
  startTime: string
  endTime: string
  penalty?: number
  freezeMinutes?: number | null
  enablePostContest?: boolean
  problems?: string[] // slugs
}

// === Update Contest ===

export interface UpdateContestRequest {
  name?: string
  description?: string
  startTime?: string
  endTime?: string
  penalty?: number
  freezeMinutes?: number | null
  enablePostContest?: boolean
  problems?: Array<{ slug: string; order: number }>
  locked?: boolean
}

// === Contest Problem Management ===

export interface AddContestProblemRequest {
  problemSlug: string
  order?: number
}

// === Registration ===

export interface RegistrationStatus {
  registered: boolean
  registeredAt?: string
}

export interface RegistrationListItem {
  nickname: string
  registeredAt: string
}

export interface RegistrationListResponse {
  registrations: RegistrationListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

// === Standings ===

export type StandingProblemStatus = 'ACCEPTED' | 'WRONG_ANSWER' | 'PENDING' | 'NOT_ATTEMPTED'

export interface StandingProblemResult {
  position: number
  status: StandingProblemStatus
  attempts: number
  time: number | null // minutes from start to AC
  penalty: number
}

export interface StandingParticipant {
  id: string
  type: 'INDIVIDUAL' | 'TEAM'
  displayName: string
  nickname?: string
  name?: string
  members?: string[]
  country?: string | null
  city?: string | null
  institution?: string | null
}

export interface StandingEntry {
  rank: number
  participant: StandingParticipant
  problemsSolved: number
  totalPenalty: number
  problems: StandingProblemResult[]
}

export interface StandingsResponse {
  contest: {
    id: string
    name: string
    status: ContestStatus
    startTime: string
    endTime: string
    penalty: number
    freezeMinutes: number | null
    isFrozen: boolean
    frozenAt: string | null
  }
  problems: Array<{ position: number; slug: string; title: string }>
  standings: StandingEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  filters: {
    country: string | null
    city: string | null
    institution: string | null
    filteredTotal: number
  }
}

export interface StandingsParams extends PaginationParams {
  country?: string
  city?: string
  institution?: string
  realtime?: boolean
}

// === Contest Submissions ===

export interface ContestSubmissionItem {
  id: string
  problem: {
    slug: string
    title: string
    order: number
  }
  submittedBy:
    | { type: 'INDIVIDUAL'; nickname: string; name: string }
    | { type: 'TEAM'; teamId: string; teamName: string; members?: string[] }
  language: string
  submittedAt: string
  judgedAt?: string
  status: string // includes '?' during freeze
  executionTime?: number
  memoryUsed?: number
  phase?: 'competition' | 'postcompetition'
}

export interface ContestSubmissionsResponse {
  contest: {
    id: string
    name: string
    status: ContestStatus
    startTime: string
    endTime: string
    freezeMinutes: number | null
    freezeTime?: string
    inFreeze?: boolean
  }
  submissions: ContestSubmissionItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface ContestSubmissionsParams extends PaginationParams {
  phase?: 'competition' | 'postcompetition' | 'all'
  problemSlug?: string
  nickname?: string
  realtime?: boolean
}
