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
  AC: { label: 'Accepted', color: 'success' },
  WA: { label: 'Wrong Answer', color: 'error' },
  TLE: { label: 'Time Limit Exceeded', color: 'warning' },
  MLE: { label: 'Memory Limit Exceeded', color: 'warning' },
  RE: { label: 'Runtime Error', color: 'error' },
  CE: { label: 'Compilation Error', color: 'error' },
  PE: { label: 'Presentation Error', color: 'warning' },
  PENDING: { label: 'Pending', color: 'default' },
} as const

export const PROGRAMMING_LANGUAGES = [
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
] as const

export const PROBLEM_CATEGORIES = [
  'Array',
  'String',
  'Hash Table',
  'Dynamic Programming',
  'Math',
  'Sorting',
  'Greedy',
  'Depth-First Search',
  'Binary Search',
  'Database',
  'Breadth-First Search',
  'Tree',
  'Matrix',
  'Two Pointers',
  'Binary Tree',
  'Bit Manipulation',
  'Stack',
  'Graph',
  'Heap',
  'Simulation',
] as const
