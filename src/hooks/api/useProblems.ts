import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as problemsApi from '@/api/problems'
import type {
  ProblemListParams,
  CreateProblemRequest,
  UpdateProblemRequest,
  DeleteProblemRequest,
} from '@/types/problem'

// === Query Keys ===

export const problemKeys = {
  all: ['problems'] as const,
  list: (params?: ProblemListParams) => ['problems', 'list', params] as const,
  detail: (slug: string) => ['problems', 'detail', slug] as const,
  statistics: (slug: string) => ['problems', 'statistics', slug] as const,
}

// === Queries ===

export function useProblems(params?: ProblemListParams) {
  return useQuery({
    queryKey: problemKeys.list(params),
    queryFn: () => problemsApi.getProblems(params),
  })
}

export function useProblemDetail(slug: string) {
  return useQuery({
    queryKey: problemKeys.detail(slug),
    queryFn: () => problemsApi.getProblemDetail(slug),
    enabled: !!slug,
  })
}

export function useProblemStatistics(slug: string) {
  return useQuery({
    queryKey: problemKeys.statistics(slug),
    queryFn: () => problemsApi.getProblemStatistics(slug),
    enabled: !!slug,
  })
}

// === Mutations ===

export function useCreateProblem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProblemRequest) => problemsApi.createProblem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: problemKeys.all })
    },
  })
}

export function useUpdateProblem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: UpdateProblemRequest }) =>
      problemsApi.updateProblem(slug, data),
    onSuccess: (_, { slug }) => {
      queryClient.invalidateQueries({ queryKey: problemKeys.all })
      queryClient.invalidateQueries({ queryKey: problemKeys.detail(slug) })
    },
  })
}

export function useDeleteProblem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: DeleteProblemRequest }) =>
      problemsApi.deleteProblem(slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: problemKeys.all })
    },
  })
}

export function usePublishProblem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (slug: string) => problemsApi.publishProblem(slug),
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: problemKeys.detail(slug) })
      queryClient.invalidateQueries({ queryKey: problemKeys.all })
    },
  })
}

export function useUnpublishProblem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (slug: string) => problemsApi.unpublishProblem(slug),
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: problemKeys.detail(slug) })
      queryClient.invalidateQueries({ queryKey: problemKeys.all })
    },
  })
}

export function useUploadProblemFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, fileType, file }: { slug: string; fileType: string; file: File }) =>
      problemsApi.uploadProblemFile(slug, fileType, file),
    onSuccess: (_, { slug }) => {
      queryClient.invalidateQueries({ queryKey: problemKeys.detail(slug) })
    },
  })
}

export function useDeleteProblemFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, fileType, fileName }: { slug: string; fileType: string; fileName?: string }) =>
      problemsApi.deleteProblemFile(slug, fileType, fileName),
    onSuccess: (_, { slug }) => {
      queryClient.invalidateQueries({ queryKey: problemKeys.detail(slug) })
    },
  })
}

export function useAddModifier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, userNickname }: { slug: string; userNickname: string }) =>
      problemsApi.addModifier(slug, userNickname),
    onSuccess: (_, { slug }) => {
      queryClient.invalidateQueries({ queryKey: problemKeys.detail(slug) })
    },
  })
}

export function useRemoveModifier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, nickname }: { slug: string; nickname: string }) =>
      problemsApi.removeModifier(slug, nickname),
    onSuccess: (_, { slug }) => {
      queryClient.invalidateQueries({ queryKey: problemKeys.detail(slug) })
    },
  })
}
