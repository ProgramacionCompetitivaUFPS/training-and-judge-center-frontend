import type { UserRole } from '@/types/user'
import type { BadgeProps } from '@/components/ui/Badge'

export const ROLE_CONFIG = {
  ADMIN: { label: 'Admin', badgeVariant: 'default' },
  COACH: { label: 'Coach', badgeVariant: 'primary' },
  CONTESTANT: { label: 'Contestant', badgeVariant: 'outline' },
} as const satisfies Record<UserRole, { label: string; badgeVariant: BadgeProps['variant'] }>

export const DIFFICULTY_COLORS = {
  easy: {
    bg: 'bg-status-success/10',
    text: 'text-status-success',
    border: 'border-status-success',
  },
  medium: {
    bg: 'bg-brand-primary-muted',
    text: 'text-brand-primary',
    border: 'border-brand-primary',
  },
  hard: {
    bg: 'bg-brand-accent-muted',
    text: 'text-brand-accent',
    border: 'border-brand-accent',
  },
} as const

export const SUBMISSION_STATUS_CONFIG = {
  ACCEPTED: { label: 'Accepted', color: 'success' },
  WRONG_ANSWER: { label: 'Wrong Answer', color: 'error' },
  TIME_LIMIT_EXCEEDED: { label: 'Time Limit Exceeded', color: 'warning' },
  MEMORY_LIMIT_EXCEEDED: { label: 'Memory Limit Exceeded', color: 'warning' },
  RUNTIME_EXCEPTION: { label: 'Runtime Error', color: 'error' },
  RUNTIME_ERROR: { label: 'Runtime Error', color: 'error' },
  COMPILATION_ERROR: { label: 'Compilation Error', color: 'error' },
  PRESENTATION_ERROR: { label: 'Presentation Error', color: 'warning' },
  PENDING: { label: 'Pending', color: 'default' },
  RUNNING: { label: 'Running', color: 'default' },
  SYSTEM_ERROR: { label: 'System Error', color: 'error' },
} as const

export const PROGRAMMING_LANGUAGES = [
  { value: 'cpp20', label: 'C++ 20' },
  { value: 'java17', label: 'Java 17' },
  { value: 'python310', label: 'Python 3.10' },
  { value: 'blockly', label: 'Blockly' },
] as const

// Source-file extensions the backend maps to a supported judging language
// (config/virtual_object.json → languageExtensions). Checker/validator/solution
// uploads must be one of these; anything else is rejected before it's even sent.
export const PROBLEM_SOURCE_FILE_EXTENSIONS = ['.cpp', '.py', '.java'] as const

export const PROBLEM_FILE_TYPE_INFO = {
  testCases: {
    label: 'Casos de prueba',
    accept: '.zip',
    extensions: ['.zip'],
    help: 'ZIP con estructura ICPC: pares de archivos .in/.ans dentro de data/sample/ (ejemplos visibles) y data/secret/ (casos reales de evaluación). Tamaño máximo: 200 MB.',
    example: 'casos.zip\n└── data/\n    ├── sample/\n    │   ├── 1.in\n    │   └── 1.ans\n    └── secret/\n        ├── 1.in\n        ├── 1.ans\n        ├── 2.in\n        └── 2.ans',
  },
  checker: {
    label: 'Checker',
    accept: PROBLEM_SOURCE_FILE_EXTENSIONS.join(','),
    extensions: PROBLEM_SOURCE_FILE_EXTENSIONS,
    help: 'Un único archivo de código fuente que compara la salida del participante contra la respuesta esperada (C++20, Python 3.10 o Java 17). Tamaño máximo: 2 MB.',
    example: 'checker.cpp',
  },
  validator: {
    label: 'Validator',
    accept: PROBLEM_SOURCE_FILE_EXTENSIONS.join(','),
    extensions: PROBLEM_SOURCE_FILE_EXTENSIONS,
    help: 'Un único archivo de código fuente que valida que cada caso de entrada cumpla el formato del enunciado, antes de juzgar (C++20, Python 3.10 o Java 17). Tamaño máximo: 2 MB.',
    example: 'validator.cpp',
  },
  solution: {
    label: 'Solución',
    accept: PROBLEM_SOURCE_FILE_EXTENSIONS.join(','),
    extensions: PROBLEM_SOURCE_FILE_EXTENSIONS,
    help: 'Un archivo de código fuente por solución de referencia (C++20, Python 3.10 o Java 17). Puedes subir varias, por ejemplo una óptima y otra de fuerza bruta. Tamaño máximo: 2 MB.',
    example: 'solucion_optima.cpp',
  },
} as const satisfies Record<string, { label: string; accept: string; extensions: readonly string[]; help: string; example: string }>

export const CONTEST_STATUS_CONFIG = {
  SCHEDULED: { label: 'Programado', color: 'default' },
  ACTIVE: { label: 'En curso', color: 'success' },
  FINISHED: { label: 'Finalizado', color: 'outline' },
} as const

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RECOVER_PASSWORD: '/recover-password',
  DASHBOARD: '/dashboard',
  PROBLEMS: '/problems',
  PROBLEM_DETAIL: '/problems/:slug',
  PROBLEM_NEW: '/problems/new',
  PROBLEM_EDIT: '/problems/:slug/edit',
  PROBLEM_STATISTICS: '/problems/:slug/statistics',
  PROBLEM_SUBMISSIONS: '/problems/:slug/submissions',
  GROUPS: '/groups',
  GROUP_NEW: '/groups/new',
  GROUP_DETAIL: '/groups/:id',
  GROUP_EDIT: '/groups/:id/edit',
  GROUP_ACCEPT_INVITATION: '/groups/:groupId/invitations/:invitationId/accept',
  CONTESTS: '/contests',
  CONTEST_NEW: '/groups/:groupId/contests/new',
  CONTEST_DETAIL: '/groups/:groupId/contests/:id',
  CONTEST_EDIT: '/groups/:groupId/contests/:id/edit',
  CONTEST_STANDINGS: '/groups/:groupId/contests/:id/standings',
  CONTEST_SUBMISSIONS: '/groups/:groupId/contests/:id/submissions',
  CONTEST_PARTICIPANTS: '/groups/:groupId/contests/:id/participants',
  CONTEST_PROBLEM: '/groups/:groupId/contests/:contestId/problems/:letter',
  MATERIALS: '/groups/:groupId/materials',
  MATERIAL_NEW: '/groups/:groupId/materials/new',
  MATERIAL_DETAIL: '/groups/:groupId/materials/:materialId',
  MATERIAL_EDIT: '/groups/:groupId/materials/:materialId/edit',
  SUBMIT_SOLUTION: '/submit',
  CONTEST_SUBMIT: '/groups/:groupId/contests/:contestId/submit',
  SUBMISSIONS: '/submissions',
  SUBMISSION_DETAIL: '/submissions/:id',
  TEAMS: '/teams',
  TEAM_DETAIL: '/teams/:teamId',
  PROFILE: '/profile',
  PROFILE_PUBLIC: '/users/:nickname',
  SETTINGS: '/settings',
  ADMIN_USERS: '/admin/users',
} as const

export const PATHS = {
  // Groups
  group: (id: string) => `/groups/${id}`,
  groupEdit: (id: string) => `/groups/${id}/edit`,
  groupAcceptInvitation: (groupId: string, invitationId: string) => `/groups/${groupId}/invitations/${invitationId}/accept`,
  // Contests
  contest: (groupId: string, id: string) => `/groups/${groupId}/contests/${id}`,
  contestNew: (groupId: string) => `/groups/${groupId}/contests/new`,
  contestEdit: (groupId: string, id: string) => `/groups/${groupId}/contests/${id}/edit`,
  contestStandings: (groupId: string, id: string) => `/groups/${groupId}/contests/${id}/standings`,
  contestSubmissions: (groupId: string, id: string) => `/groups/${groupId}/contests/${id}/submissions`,
  contestParticipants: (groupId: string, id: string) => `/groups/${groupId}/contests/${id}/participants`,
  contestProblem: (groupId: string, contestId: string, letter: string) =>
    `/groups/${groupId}/contests/${contestId}/problems/${letter}`,
  contestSubmit: (groupId: string, contestId: string, problem?: string) =>
    `/groups/${groupId}/contests/${contestId}/submit${problem ? `?problem=${problem}` : ''}`,
  // Problems
  problem: (slug: string) => `/problems/${slug}`,
  problemEdit: (slug: string) => `/problems/${slug}/edit`,
  problemSubmissions: (slug: string) => `/problems/${slug}/submissions`,
  // Submissions
  submission: (id: string) => `/submissions/${id}`,
  // Materials
  materials: (groupId: string) => `/groups/${groupId}/materials`,
  materialNew: (groupId: string) => `/groups/${groupId}/materials/new`,
  material: (groupId: string, materialId: string) => `/groups/${groupId}/materials/${materialId}`,
  materialEdit: (groupId: string, materialId: string) => `/groups/${groupId}/materials/${materialId}/edit`,
}
