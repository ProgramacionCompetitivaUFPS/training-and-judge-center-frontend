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
] as const

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
  GROUPS: '/groups',
  GROUP_NEW: '/groups/new',
  GROUP_DETAIL: '/groups/:id',
  GROUP_EDIT: '/groups/:id/edit',
  CONTESTS: '/contests',
  CONTEST_NEW: '/groups/:groupId/contests/new',
  CONTEST_DETAIL: '/contests/:id',
  CONTEST_EDIT: '/groups/:groupId/contests/:id/edit',
  CONTEST_STANDINGS: '/contests/:id/standings',
  CONTEST_SUBMISSIONS: '/contests/:id/submissions',
  MATERIALS: '/groups/:groupId/materials',
  MATERIAL_NEW: '/groups/:groupId/materials/new',
  MATERIAL_DETAIL: '/groups/:groupId/materials/:materialId',
  MATERIAL_EDIT: '/groups/:groupId/materials/:materialId/edit',
  SUBMISSIONS: '/submissions',
  SUBMISSION_DETAIL: '/submissions/:id',
  TEAMS: '/teams',
  TEAM_DETAIL: '/teams/:teamId',
  PROFILE: '/profile',
  PROFILE_PUBLIC: '/users/:nickname',
  SETTINGS: '/settings',
  ADMIN_USERS: '/admin/users',
} as const
