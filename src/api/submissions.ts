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
  return apiClient.get(`/problems/p/${problemSlug}/submissions`, {
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
  return apiClient.postFormData(`/problems/p/${problemSlug}/submissions`, formData)
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

// === Download (client-side — no endpoint needed) ===

export function downloadSubmissionBlob(sourceCode: string, filename: string): void {
  const blob = new Blob([sourceCode], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// === Rejudge ===

export function rejudgeSubmission(submissionId: string): Promise<void> {
  return apiClient.post(`/submissions/${submissionId}/rejudge`)
}

export function adminRejudgeSubmission(submissionId: string): Promise<void> {
  return apiClient.post(`/admin/submissions/${submissionId}/rejudge`)
}

// === Submit Blockly Solution (outside contest) ===

export function submitBlocklySolution(
  problemSlug: string,
  pythonCode: string,
  workspaceXml: string,
  svgBlob: Blob,
): Promise<SubmitSolutionResponse> {
  const formData = new FormData()
  formData.append('file', new File([pythonCode], 'solution.py', { type: 'text/x-python' }))
  formData.append('workspaceXml', new File([workspaceXml], 'workspace.xml', { type: 'text/xml' }))
  formData.append('blocksSvg', new File([svgBlob], 'blocks.svg', { type: 'image/svg+xml' }))
  formData.append('language', 'Blockly')
  formData.append('compiler', 'python3')
  formData.append('blocklySubmission', '1')
  return apiClient.postFormData(`/problems/p/${problemSlug}/submissions`, formData)
}

// === Submit Blockly Solution (in contest) ===

export function submitBlocklyContestSolution(
  groupId: string,
  contestId: string,
  problemSlug: string,
  pythonCode: string,
  workspaceXml: string,
  svgBlob: Blob,
): Promise<SubmitSolutionResponse> {
  const formData = new FormData()
  formData.append('file', new File([pythonCode], 'solution.py', { type: 'text/x-python' }))
  formData.append('workspaceXml', new File([workspaceXml], 'workspace.xml', { type: 'text/xml' }))
  formData.append('blocksSvg', new File([svgBlob], 'blocks.svg', { type: 'image/svg+xml' }))
  formData.append('language', 'Blockly')
  formData.append('compiler', 'python3')
  formData.append('blocklySubmission', '1')
  return apiClient.postFormData(
    `/groups/${groupId}/contests/${contestId}/problems/${problemSlug}/submissions`,
    formData,
  )
}
