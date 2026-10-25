import { apiClient } from './client'
import { JUDGE_LANGUAGES } from '@/lib/constants'
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

// The backend stores a block editor submission as python310 plus its workspace and flags it
// with isBlocklySubmission; the UI treats Blockly as its own language (badge, filters, recovery
// into the block editor), so that's applied once here to every submission it receives.
export function withBlocklyLanguage<T extends { language: string; isBlocklySubmission?: boolean }>(sub: T): T {
  return sub.isBlocklySubmission ? { ...sub, language: 'blockly' } : sub
}

function withBlocklyLanguages(res: SubmissionListResponse): SubmissionListResponse {
  return { ...res, submissions: res.submissions.map(withBlocklyLanguage) }
}

export async function getMySubmissions(params?: MySubmissionsParams): Promise<SubmissionListResponse> {
  const res = await apiClient.get<SubmissionListResponse>('/users/me/submissions', {
    params: params as Record<string, string | number | boolean | undefined>,
  })
  return withBlocklyLanguages(res)
}

// === Submission Detail ===

export async function getSubmission(id: string): Promise<SubmissionDetail> {
  return withBlocklyLanguage(await apiClient.get<SubmissionDetail>(`/submissions/${id}`))
}

// === Problem Submissions (outside contest) ===

export async function getProblemSubmissions(
  problemSlug: string,
  params?: ProblemSubmissionsParams,
): Promise<SubmissionListResponse> {
  const res = await apiClient.get<SubmissionListResponse>(`/problems/p/${problemSlug}/submissions`, {
    params: params as Record<string, string | number | boolean | undefined>,
  })
  return withBlocklyLanguages(res)
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
): Promise<SubmitSolutionResponse> {
  return apiClient.postFormData(`/problems/p/${problemSlug}/submissions`, blocklyFormData(pythonCode, workspaceXml))
}

// === Submit Blockly Solution (in contest) ===

export function submitBlocklyContestSolution(
  groupId: string,
  contestId: string,
  problemSlug: string,
  pythonCode: string,
  workspaceXml: string,
): Promise<SubmitSolutionResponse> {
  return apiClient.postFormData(
    `/groups/${groupId}/contests/${contestId}/problems/${problemSlug}/submissions`,
    blocklyFormData(pythonCode, workspaceXml),
  )
}

// A block editor submission is judged as Python 3.10: the generated code is the source and the
// workspace travels with it so the blocks can be shown and reloaded later.
function blocklyFormData(pythonCode: string, workspaceXml: string): FormData {
  const python = JUDGE_LANGUAGES.python310
  const formData = new FormData()
  formData.append('file', new File([pythonCode], `solution.${python.fileExtension}`, { type: 'text/x-python' }))
  formData.append('workspaceXml', new File([workspaceXml], 'workspace.xml', { type: 'text/xml' }))
  formData.append('language', 'python310')
  formData.append('compiler', python.compiler)
  return formData
}
