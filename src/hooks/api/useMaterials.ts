import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as materialsApi from '@/api/materials'
import type {
  MaterialListParams,
  CreateMaterialRequest,
  UpdateMaterialRequest,
} from '@/types/material'

// === Query Keys ===

export const materialKeys = {
  all: ['materials'] as const,
  list: (groupId: string, params?: MaterialListParams) =>
    ['materials', 'list', groupId, params] as const,
  detail: (groupId: string, materialId: string) =>
    ['materials', 'detail', groupId, materialId] as const,
}

// === Queries ===

export function useMaterials(groupId: string, params?: MaterialListParams) {
  return useQuery({
    queryKey: materialKeys.list(groupId, params),
    queryFn: () => materialsApi.getMaterials(groupId, params),
    enabled: !!groupId,
  })
}

export function useMaterialDetail(groupId: string, materialId: string) {
  return useQuery({
    queryKey: materialKeys.detail(groupId, materialId),
    queryFn: () => materialsApi.getMaterial(groupId, materialId),
    enabled: !!groupId && !!materialId,
  })
}

// === Mutations ===

export function useCreateMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: CreateMaterialRequest }) =>
      materialsApi.createMaterial(groupId, data),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: materialKeys.list(groupId) })
    },
  })
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      groupId, materialId, data,
    }: { groupId: string; materialId: string; data: UpdateMaterialRequest }) =>
      materialsApi.updateMaterial(groupId, materialId, data),
    onSuccess: (_, { groupId, materialId }) => {
      queryClient.invalidateQueries({ queryKey: materialKeys.detail(groupId, materialId) })
      queryClient.invalidateQueries({ queryKey: materialKeys.list(groupId) })
    },
  })
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, materialId }: { groupId: string; materialId: string }) =>
      materialsApi.deleteMaterial(groupId, materialId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: materialKeys.list(groupId) })
    },
  })
}

export function usePublishMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, materialId }: { groupId: string; materialId: string }) =>
      materialsApi.publishMaterial(groupId, materialId),
    onSuccess: (_, { groupId, materialId }) => {
      queryClient.invalidateQueries({ queryKey: materialKeys.detail(groupId, materialId) })
      queryClient.invalidateQueries({ queryKey: materialKeys.list(groupId) })
    },
  })
}

export function useUnpublishMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, materialId }: { groupId: string; materialId: string }) =>
      materialsApi.unpublishMaterial(groupId, materialId),
    onSuccess: (_, { groupId, materialId }) => {
      queryClient.invalidateQueries({ queryKey: materialKeys.detail(groupId, materialId) })
      queryClient.invalidateQueries({ queryKey: materialKeys.list(groupId) })
    },
  })
}

export function usePinMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, materialId }: { groupId: string; materialId: string }) =>
      materialsApi.pinMaterial(groupId, materialId),
    onSuccess: (_, { groupId, materialId }) => {
      queryClient.invalidateQueries({ queryKey: materialKeys.detail(groupId, materialId) })
      queryClient.invalidateQueries({ queryKey: materialKeys.list(groupId) })
    },
  })
}

export function useUnpinMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, materialId }: { groupId: string; materialId: string }) =>
      materialsApi.unpinMaterial(groupId, materialId),
    onSuccess: (_, { groupId, materialId }) => {
      queryClient.invalidateQueries({ queryKey: materialKeys.detail(groupId, materialId) })
      queryClient.invalidateQueries({ queryKey: materialKeys.list(groupId) })
    },
  })
}
