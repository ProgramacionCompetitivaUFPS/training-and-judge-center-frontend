import { apiClient } from './client'
import type {
  ProblemListParams,
  ProblemListResponse,
  ProblemTagsResponse,
  ProblemDetail,
  CreateProblemRequest,
  UpdateProblemRequest,
  DeleteProblemRequest,
  PublishResponse,
  ValidateResponse,
  LatestValidation,
  UnpublishResponse,
  ProblemStatistics,
  ProblemModifier,
  ProblemAccessibility,
  ProblemFiles,
  TestCasesResponse,
  TestCaseKind,
  ProblemSourceFile,
  ProblemSourceFileType,
} from '@/types/problem'

// === CRUD ===

export function getProblems(params?: ProblemListParams): Promise<ProblemListResponse> {
  return apiClient.get('/problems', { params: params as Record<string, string | number | boolean | undefined> })
}

// Vocabulario cerrado real del backend — ver nota en types/problem.ts (ProblemTagsResponse).
export function getProblemTags(): Promise<ProblemTagsResponse> {
  return apiClient.get('/problems/tags')
}

export function getProblemDetail(slug: string): Promise<ProblemDetail> {
  return apiClient.get(`/problems/p/${slug}`)
}

export function createProblem(data: CreateProblemRequest): Promise<ProblemDetail> {
  return apiClient.post('/problems', data)
}

export function updateProblem(slug: string, data: UpdateProblemRequest): Promise<ProblemDetail> {
  return apiClient.put(`/problems/p/${slug}`, data)
}

export function deleteProblem(slug: string, data: DeleteProblemRequest): Promise<void> {
  return apiClient.delete(`/problems/p/${slug}`, { body: data })
}

// === Publish / Unpublish ===

export function publishProblem(slug: string): Promise<PublishResponse> {
  return apiClient.post(`/problems/p/${slug}/publish`)
}

// Starts the publication validation on a draft without publishing it; answers right away (202).
export function validateProblem(slug: string): Promise<ValidateResponse> {
  return apiClient.post(`/problems/p/${slug}/validate`)
}

export function getLatestValidation(slug: string): Promise<LatestValidation> {
  return apiClient.get(`/problems/p/${slug}/validation`)
}

export function unpublishProblem(slug: string): Promise<UnpublishResponse> {
  return apiClient.post(`/problems/p/${slug}/unpublish`)
}

// === Files ===

export function uploadProblemFile(slug: string, fileType: string, file: File): Promise<{ message: string; fileType: string; fileName: string; files: ProblemFiles }> {
  const formData = new FormData()
  formData.append('fileType', fileType)
  formData.append('file', file)
  return apiClient.postFormData(`/problems/p/${slug}/files`, formData)
}

export function deleteProblemFile(slug: string, fileType: string, fileName?: string): Promise<void> {
  const params = fileName ? { fileName } : undefined
  return apiClient.delete(`/problems/p/${slug}/files/${fileType}`, { params })
}

// === Lectura de archivos (autor, colaboradores y Admin) ===

export function getProblemTestCases(slug: string): Promise<TestCasesResponse> {
  return apiClient.get(`/problems/p/${slug}/testcases`)
}

// Código de una solución (fileName obligatorio: puede haber varias), del checker o del validador.
// `full` asks for the whole file; without it the backend cuts it at 256 KiB.
export function getProblemSourceFile(slug: string, fileType: ProblemSourceFileType, fileName?: string, full = false): Promise<ProblemSourceFile> {
  const params: Record<string, string | boolean> = {}
  if (fileName) params.fileName = fileName
  if (full) params.full = true
  return apiClient.get(`/problems/p/${slug}/files/${fileType}`, { params })
}

// One file of a case in full, as plain text (a test input can weigh tens of MB, so it doesn't go
// through JSON like the preview does).
export async function getProblemTestCasePart(slug: string, kind: TestCaseKind, name: string, part: 'input' | 'answer'): Promise<string> {
  const blob = await apiClient.getBlob(`/problems/p/${slug}/testcases/${kind}/${encodeURIComponent(name)}/${part}`)
  return blob.text()
}

// El ZIP de casos de prueba tal como se subió.
export function downloadProblemTestCases(slug: string): Promise<Blob> {
  return apiClient.getBlob(`/problems/p/${slug}/files/testcases`)
}

// Paquete ICPC completo (el inverso de "Importar ZIP").
export function exportProblem(slug: string): Promise<Blob> {
  return apiClient.getBlob(`/problems/p/${slug}/export`)
}

// === Modifiers ===

export function addModifier(slug: string, userNickname: string): Promise<{ message: string; modifiers: Array<{ nickname: string; name: string }> }> {
  return apiClient.post(`/problems/p/${slug}/modifiers`, { userNickname })
}

export function removeModifier(slug: string, nickname: string): Promise<void> {
  return apiClient.delete(`/problems/p/${slug}/modifiers/${nickname}`)
}

// === Statistics ===

export function getProblemStatistics(slug: string): Promise<ProblemStatistics> {
  return apiClient.get(`/problems/p/${slug}/statistics`)
}

// === Import ===

export function importProblem(file: File, slug: string): Promise<ProblemDetail> {
  const formData = new FormData()
  formData.append('slug', slug)
  formData.append('file', file)
  return apiClient.postFormData('/problems/import', formData)
}

// === Accessibility ===

export function updateAccessibility(slug: string, accessibility: ProblemAccessibility): Promise<void> {
  return apiClient.patch(`/problems/p/${slug}/accessibility`, { accessibility })
}

// === Modifiers (read) ===

export function getModifiers(slug: string): Promise<ProblemModifier[]> {
  return apiClient.get(`/problems/p/${slug}/modifiers`)
}

// === Admin Rejudge ===

export function adminRejudgeProblem(slug: string, contestId?: string): Promise<void> {
  return apiClient.post(`/admin/problems/${slug}/rejudge`, undefined, { params: { contestId } })
}
