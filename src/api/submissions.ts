import { apiClient } from './client'
import type {
  MySubmissionsParams,
  SubmissionListResponse,
  ProblemSubmissionsParams,
  SubmissionDetail,
  SubmitSolutionResponse,
  UpdateVisibilityRequest,
  UpdateVisibilityResponse,
} from '@/types/submission'

// === My Submissions ===

export function getMySubmissions(params?: MySubmissionsParams): Promise<SubmissionListResponse> {
  return apiClient.get('/users/me/submissions', {
    params: params as Record<string, string | number | boolean | undefined>,
  })
}

// === Submission Detail ===

export function getSubmission(id: string): Promise<SubmissionDetail> {
  return apiClient.get(`/submissions/${id}`)
}

// === Problem Submissions (outside contest) ===

export function getProblemSubmissions(
  problemSlug: string,
  params?: ProblemSubmissionsParams,
): Promise<SubmissionListResponse> {
  return apiClient.get(`/problems/${problemSlug}/submissions`, {
    params: params as Record<string, string | number | boolean | undefined>,
  })
}

// === Submit Solution (outside contest) ===

export function submitSolution(
  problemSlug: string,
  file: File,
  language: string,
  compiler: string,
): Promise<SubmitSolutionResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('language', language)
  formData.append('compiler', compiler)
  return apiClient.postFormData(`/problems/${problemSlug}/submissions`, formData)
}

// === Submit Solution (in contest) ===

export function submitContestSolution(
  groupId: string,
  contestId: string,
  problemSlug: string,
  file: File,
  language: string,
  compiler: string,
): Promise<SubmitSolutionResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('language', language)
  formData.append('compiler', compiler)
  return apiClient.postFormData(
    `/groups/${groupId}/contests/${contestId}/problems/${problemSlug}/submissions`,
    formData,
  )
}

// === Visibility ===

export function updateSubmissionVisibility(
  id: string,
  data: UpdateVisibilityRequest,
): Promise<UpdateVisibilityResponse> {
  return apiClient.patch(`/submissions/${id}/visibility`, data)
}

// === Download ===

export async function downloadSubmission(id: string): Promise<Blob> {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
  const token = localStorage.getItem('auth_token')
  const response = await fetch(`${API_BASE_URL}/submissions/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'UNKNOWN', message: response.statusText }))
    throw new Error(error.message || 'Error al descargar')
  }
  return response.blob()
}
