import { apiClient } from './client'
import type {
  ProblemListParams,
  ProblemListResponse,
  ProblemDetail,
  CreateProblemRequest,
  UpdateProblemRequest,
  DeleteProblemRequest,
  PublishResponse,
  UnpublishResponse,
  ProblemStatistics,
  ProblemModifier,
  ProblemAccessibility,
} from '@/types/problem'

// === CRUD ===

export function getProblems(params?: ProblemListParams): Promise<ProblemListResponse> {
  return apiClient.get('/problems', { params: params as Record<string, string | number | boolean | undefined> })
}

export function getProblemDetail(slug: string): Promise<ProblemDetail> {
  return apiClient.get(`/problems/${slug}`)
}

export function createProblem(data: CreateProblemRequest): Promise<ProblemDetail> {
  return apiClient.post('/problems', data)
}

export function updateProblem(slug: string, data: UpdateProblemRequest): Promise<ProblemDetail> {
  return apiClient.put(`/problems/${slug}`, data)
}

export function deleteProblem(slug: string, data: DeleteProblemRequest): Promise<void> {
  return apiClient.delete(`/problems/${slug}`, { body: data })
}

// === Publish / Unpublish ===

export function publishProblem(slug: string): Promise<PublishResponse> {
  return apiClient.post(`/problems/${slug}/publish`)
}

export function unpublishProblem(slug: string): Promise<UnpublishResponse> {
  return apiClient.post(`/problems/${slug}/unpublish`)
}

// === Files ===

export function uploadProblemFile(slug: string, fileType: string, file: File): Promise<{ message: string; fileType: string; fileName: string; files: { testCases: boolean; solutions: string[]; checker: boolean; validator: boolean } }> {
  const formData = new FormData()
  formData.append('fileType', fileType)
  formData.append('file', file)
  return apiClient.postFormData(`/problems/${slug}/files`, formData)
}

export function deleteProblemFile(slug: string, fileType: string, fileName?: string): Promise<void> {
  const params = fileName ? { fileName } : undefined
  return apiClient.delete(`/problems/${slug}/files/${fileType}`, { params })
}

// === Modifiers ===

export function addModifier(slug: string, userNickname: string): Promise<{ message: string; modifiers: Array<{ nickname: string; name: string }> }> {
  return apiClient.post(`/problems/${slug}/modifiers`, { userNickname })
}

export function removeModifier(slug: string, nickname: string): Promise<void> {
  return apiClient.delete(`/problems/${slug}/modifiers/${nickname}`)
}

// === Statistics ===

export function getProblemStatistics(slug: string): Promise<ProblemStatistics> {
  return apiClient.get(`/problems/${slug}/statistics`)
}

// === Import ===

export function importProblem(file: File): Promise<ProblemDetail> {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.postFormData('/problems/import', formData)
}

// === Accessibility ===

export function updateAccessibility(slug: string, accessibility: ProblemAccessibility): Promise<void> {
  return apiClient.patch(`/problems/${slug}/accessibility`, { accessibility })
}

// === Modifiers (read) ===

export function getModifiers(slug: string): Promise<ProblemModifier[]> {
  return apiClient.get(`/problems/${slug}/modifiers`)
}

// === Admin Rejudge ===

export function adminRejudgeProblem(slug: string): Promise<void> {
  return apiClient.post(`/admin/problems/${slug}/rejudge`)
}
