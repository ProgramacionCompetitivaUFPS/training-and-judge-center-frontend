// Problem types
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

// Submission types
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

export type SubmissionStatus = 
  | 'AC'  // Accepted
  | 'WA'  // Wrong Answer
  | 'TLE' // Time Limit Exceeded
  | 'MLE' // Memory Limit Exceeded
  | 'RE'  // Runtime Error
  | 'CE'  // Compilation Error
  | 'PE'  // Presentation Error
  | 'PENDING'

// User types
export interface User {
  id: string
  username: string
  email: string
  avatar?: string
  solvedProblems: number
  totalSubmissions: number
  rank?: number
}

// Filter types
export interface ProblemFilters {
  difficulty?: 'easy' | 'medium' | 'hard'
  category?: string
  status?: 'solved' | 'attempted' | 'unsolved'
  search?: string
}
