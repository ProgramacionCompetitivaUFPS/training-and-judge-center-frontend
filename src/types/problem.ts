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

// El vocabulario cerrado de tags del backend (config/virtual_object.json) — CreateProblem/
// UpdateProblem rechazan cualquier tag fuera de esta lista, a diferencia de los tags de
// materiales (que son libres). La UI debe ofrecer estos como opciones, no un arreglo fijo propio.
export interface ProblemTagsResponse {
  tags: string[]
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

export interface ValidationSummary {
  sampleCases: number
  secretCases: number
  solutionsTested: number
  allPassed: boolean
}

export interface PublishResponse {
  slug: string
  status: ProblemStatus
  message: string
  validationLogs?: string[]
  validationSummary?: ValidationSummary
}

// The 400 shape the real backend returns when publish validation fails — either the cheap
// required-fields precheck (missingFields) or the deeper judge-backed validation
// (failedTestCases/compilationErrors/failedInputs), never both at once in practice.
export interface FailedTestCase {
  case: string
  verdict?: string
  expected?: string
  actual?: string
  status?: string
  details?: string
  timeLimit?: number
}

export interface CompilationErrors {
  file: string
  errors: string[]
}

export interface FailedInput {
  file: string
  reason: string
}

export interface PublishFailureResponse {
  error: string
  message: string
  validationLogs?: string[]
  missingFields?: string[]
  failedTestCases?: FailedTestCase[]
  compilationErrors?: CompilationErrors
  failedInputs?: FailedInput[]
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

// === Casos de prueba (lectura; solo autor, colaboradores y Admin) ===

export type TestCaseKind = 'sample' | 'secret'

export interface TestCaseSummary {
  kind: TestCaseKind
  name: string
  /** Tamaño del .in en bytes; null si el ZIP no trae ese archivo */
  inputBytes: number | null
  /** Tamaño del .ans en bytes; null si el ZIP no trae ese archivo */
  answerBytes: number | null
}

export interface TestCasesResponse {
  hasTestCases: boolean
  sampleCount: number
  secretCount: number
  cases: TestCaseSummary[]
}

export interface TestCasePreview {
  kind: TestCaseKind
  name: string
  input: string
  answer: string
  /** El backend corta cada archivo a 64 KiB en la vista previa */
  inputTruncated: boolean
  answerTruncated: boolean
}
