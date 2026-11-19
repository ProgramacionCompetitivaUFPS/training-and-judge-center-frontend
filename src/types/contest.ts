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
  color?: string | null
}

/**
 * Lo que responde el PUT de la competencia. NO es un ContestDetail completo: los problemas
 * vienen con `order` (el GET usa `position`), sin límites de tiempo/memoria, y faltan campos
 * como `participantCount`. Hay que fusionarlo con el detalle cacheado (ver `mergeContestUpdate`).
 */
export type UpdateContestResponse = Partial<Omit<ContestDetail, 'problems'>> & {
  problems?: Array<Partial<ContestProblem> & { slug: string; order?: number }>
}

export interface ContestProblemPayload {
  slug: string
  order: number
  color?: string | null
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
  participationMode: ParticipationMode
  participantCount: number
  isRegistered: boolean
  problemCount: number
  userGroupRole: 'LEAD' | 'MEMBER' | null
  group: { id: string; name: string }
}

// === Contest List Params ===

export interface ContestListParams extends PaginationParams {
  status?: ContestStatus
  search?: string
  sortBy?: 'startTime' | 'createdAt' | 'name'
  sortOrder?: 'asc' | 'desc'
}

export interface ContestListResponse {
  items: ContestListItem[]
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
  participationMode?: ParticipationMode
  teamSizeMin?: number
  teamSizeMax?: number
  showTeamMembers?: boolean
}

// === Update Contest ===

export interface UpdateContestRequest {
  name?: string
  /** null clears the description */
  description?: string | null
  startTime?: string
  endTime?: string
  penalty?: number
  freezeMinutes?: number | null
  enablePostContest?: boolean
  problems?: ContestProblemPayload[]
  locked?: boolean
  participationMode?: ParticipationMode
  teamSizeMin?: number
  teamSizeMax?: number
  showTeamMembers?: boolean
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
  type?: 'INDIVIDUAL' | 'TEAM'
  nickname?: string
  teamName?: string
  members?: string[]
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
  /** Primer AC de ese problema en toda la competencia. */
  isFirstSolve?: boolean
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

/** `all` = oficiales y post-competencia; `competition` = solo oficiales; `postcompetition` = solo post. */
export type StandingsPhase = 'all' | 'competition' | 'postcompetition'

export interface StandingEntry {
  /** null en filas de post-competencia. */
  rank: number | null
  /** Ausente = oficial (backend anterior). */
  isOfficial?: boolean
  participant: StandingParticipant
  problemsSolved: number
  totalPenalty: number
  problems: StandingProblemResult[]
}

export interface StandingsProblem {
  position: number
  slug: string
  title: string
  color?: string | null
  /** Contadores globales (no dependen de la página ni de los filtros). */
  accepted?: number
  tried?: number
  /** Contadores de las filas de post-competencia (siempre presentes en el backend actual; 0 sin fase post). */
  postAccepted?: number
  postTried?: number
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
  problems: StandingsProblem[]
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
  phase?: StandingsPhase
  realtime?: boolean
}

// Distinct, non-empty country/city/institution values actually in use among a
// contest's participants (GET .../standings/filters) — backs the standings
// filter so it offers real values instead of free text with an unknown exact
// spelling. Same shape as AdminUserFilterOptions.
export interface StandingsFilterOptions {
  countries: string[]
  cities: string[]
  institutions: string[]
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
  isBlocklySubmission: boolean
  submittedAt: string
  judgedAt?: string
  status: string // includes '?' during freeze
  timeMs?: number
  memoryKb?: number
  phase?: 'competition' | 'postcompetition'
  /** Own or team submission, Lead/Admin, or one its author made public. */
  canViewDetail: boolean
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
