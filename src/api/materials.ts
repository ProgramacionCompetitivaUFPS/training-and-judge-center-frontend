import { apiClient } from './client'
import type {
  Material,
  MaterialListParams,
  MaterialListResponse,
  CreateMaterialRequest,
  UpdateMaterialRequest,
} from '@/types/material'

// === Queries ===

export async function getMaterials(
  groupId: string,
  params?: MaterialListParams,
): Promise<MaterialListResponse> {
  return apiClient.get(`/groups/${groupId}/materials`, { params: params as Record<string, string | number | boolean | undefined> })
}

// Orphan endpoint decision: kept — needed for the material detail page
export async function getMaterial(
  groupId: string,
  materialId: string,
): Promise<Material> {
  return apiClient.get(`/groups/${groupId}/materials/${materialId}`)
}

// === Mutations ===

export async function createMaterial(
  groupId: string,
  data: CreateMaterialRequest,
): Promise<Material> {
  const response = await apiClient.post<Record<string, unknown>>(`/groups/${groupId}/materials`, data)
  // The backend may return groupId/authorId as plain UUID strings instead of
  // the nested objects { id, name } / { nickname, name } expected by the Material interface.
  // Transform the response if needed to match the frontend Material shape.
  const raw = response as Record<string, unknown>
  if (typeof raw.groupId === 'string' && !raw.group) {
    (raw as Record<string, unknown>).group = { id: raw.groupId, name: '' }
  }
  if (typeof raw.authorId === 'string' && !raw.author) {
    (raw as Record<string, unknown>).author = { nickname: '', name: '' }
  }
  return raw as unknown as Material
}

export async function updateMaterial(
  groupId: string,
  materialId: string,
  data: UpdateMaterialRequest,
): Promise<Material> {
  return apiClient.put(`/groups/${groupId}/materials/${materialId}`, data)
}

export async function deleteMaterial(
  groupId: string,
  materialId: string,
): Promise<void> {
  return apiClient.delete(`/groups/${groupId}/materials/${materialId}`)
}

// === Visibility ===

export async function publishMaterial(
  groupId: string,
  materialId: string,
): Promise<Material> {
  return apiClient.post(`/groups/${groupId}/materials/${materialId}/publish`)
}

export async function unpublishMaterial(
  groupId: string,
  materialId: string,
): Promise<Material> {
  return apiClient.post(`/groups/${groupId}/materials/${materialId}/unpublish`)
}

export async function pinMaterial(
  groupId: string,
  materialId: string,
): Promise<Material> {
  return apiClient.post(`/groups/${groupId}/materials/${materialId}/pin`)
}

export async function unpinMaterial(
  groupId: string,
  materialId: string,
): Promise<Material> {
  return apiClient.post(`/groups/${groupId}/materials/${materialId}/unpin`)
}
