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

export function downloadSubmission(id: string): Promise<Blob> {
  return apiClient.getBlob(`/submissions/${id}/download`)
}
