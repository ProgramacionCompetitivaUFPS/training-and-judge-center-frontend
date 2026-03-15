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

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RECOVER_PASSWORD: '/recover-password',
  DASHBOARD: '/dashboard',
  PROBLEMS: '/problems',
  PROBLEM_DETAIL: '/problems/:slug',
  GROUPS: '/groups',
  GROUP_DETAIL: '/groups/:id',
  CONTESTS: '/contests',
  CONTEST_DETAIL: '/contests/:id',
  MATERIALS: '/materials',
  SUBMISSIONS: '/submissions',
  TEAMS: '/teams',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  ADMIN_USERS: '/admin/users',
} as const
