import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as problemsApi from '@/api/problems'
import type {
  ProblemListParams,
  CreateProblemRequest,
  UpdateProblemRequest,
  DeleteProblemRequest,
  ProblemAccessibility,
  TestCaseKind,
  ProblemSourceFileType,
} from '@/types/problem'
import { saveBlobAs } from '@/lib/download'

// === Query Keys ===

export const problemKeys = {
  all: ['problems'] as const,
  list: (params?: ProblemListParams) => ['problems', 'list', params] as const,
  detail: (slug: string) => ['problems', 'detail', slug] as const,
  statistics: (slug: string) => ['problems', 'statistics', slug] as const,
  modifiers: (slug: string) => ['problems', 'modifiers', slug] as const,
  testCases: (slug: string) => ['problems', 'testCases', slug] as const,
  testCase: (slug: string, kind: TestCaseKind, name: string) => ['problems', 'testCases', slug, kind, name] as const,
  sourceFiles: (slug: string) => ['problems', 'sourceFiles', slug] as const,
  sourceFile: (slug: string, fileType: ProblemSourceFileType, fileName?: string, full = false) =>
    ['problems', 'sourceFiles', slug, fileType, fileName ?? '', full ? 'full' : 'preview'] as const,
  testCasePart: (slug: string, kind: TestCaseKind, name: string, part: string) => ['problems', 'testCases', slug, kind, name, part] as const,
  tags: ['problems', 'tags'] as const,
}

// === Queries ===

export function useProblems(params?: ProblemListParams) {
  return useQuery({
    queryKey: problemKeys.list(params),
    queryFn: () => problemsApi.getProblems(params),
  })
}

// Caller is expected to debounce `search`; only published problems, only fetches at 2+ chars.
export function useProblemSearch(search: string) {
  const params: ProblemListParams = { search, status: 'PUBLISHED', limit: 10 }
  return useQuery({
    queryKey: problemKeys.list(params),
    queryFn: () => problemsApi.getProblems(params),
    enabled: search.trim().length >= 2,
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

// Vocabulario cerrado del backend (config/virtual_object.json) — no cambia con el contenido,
// así que una caché larga evita refetch constante sin arriesgar sugerencias obsoletas.
export function useProblemTags() {
  return useQuery({
    queryKey: problemKeys.tags,
    queryFn: () => problemsApi.getProblemTags(),
    staleTime: 10 * 60 * 1000,
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
      queryClient.invalidateQueries({ queryKey: problemKeys.testCases(slug) })
      queryClient.invalidateQueries({ queryKey: problemKeys.sourceFiles(slug) })
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
      queryClient.invalidateQueries({ queryKey: problemKeys.testCases(slug) })
      queryClient.invalidateQueries({ queryKey: problemKeys.sourceFiles(slug) })
    },
  })
}

// === Lectura y descarga de archivos (autor, colaboradores y Admin) ===

// `enabled` lets the caller hold the request until the list is actually opened: the backend
// reads the whole test cases ZIP from storage to answer it.
export function useProblemTestCases(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: problemKeys.testCases(slug),
    queryFn: () => problemsApi.getProblemTestCases(slug),
    enabled,
  })
}

export function useProblemTestCase(slug: string, kind: TestCaseKind, name: string, enabled: boolean) {
  return useQuery({
    queryKey: problemKeys.testCase(slug, kind, name),
    queryFn: () => problemsApi.getProblemTestCase(slug, kind, name),
    enabled,
  })
}

export function useProblemSourceFile(slug: string, fileType: ProblemSourceFileType, fileName: string | undefined, enabled: boolean, full = false) {
  return useQuery({
    queryKey: problemKeys.sourceFile(slug, fileType, fileName, full),
    queryFn: () => problemsApi.getProblemSourceFile(slug, fileType, fileName, full),
    enabled,
  })
}

// A whole test file can be tens of MB: don't keep it in memory once the page is left.
export function useProblemTestCasePart(slug: string, kind: TestCaseKind, name: string, part: 'input' | 'answer', enabled: boolean) {
  return useQuery({
    queryKey: problemKeys.testCasePart(slug, kind, name, part),
    queryFn: () => problemsApi.getProblemTestCasePart(slug, kind, name, part),
    enabled,
    gcTime: 30_000,
  })
}

export function useDownloadTestCases() {
  return useMutation({
    mutationFn: async (slug: string) => {
      saveBlobAs(await problemsApi.downloadProblemTestCases(slug), `${slug}-testcases.zip`)
    },
  })
}

export function useExportProblem() {
  return useMutation({
    mutationFn: async (slug: string) => {
      saveBlobAs(await problemsApi.exportProblem(slug), `${slug}.zip`)
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

// === Import ===

export function useImportProblem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, slug }: { file: File; slug: string }) => problemsApi.importProblem(file, slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: problemKeys.all })
    },
  })
}

// === Accessibility ===

export function useUpdateAccessibility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, accessibility }: { slug: string; accessibility: ProblemAccessibility }) =>
      problemsApi.updateAccessibility(slug, accessibility),
    onSuccess: (_, { slug }) => {
      queryClient.invalidateQueries({ queryKey: problemKeys.detail(slug) })
      queryClient.invalidateQueries({ queryKey: problemKeys.all })
    },
  })
}

// === Modifiers (read) ===

export function useGetModifiers(slug: string) {
  return useQuery({
    queryKey: problemKeys.modifiers(slug),
    queryFn: () => problemsApi.getModifiers(slug),
    enabled: !!slug,
  })
}

// === Admin Rejudge ===

export function useAdminRejudgeProblem() {
  return useMutation({
    mutationFn: ({ slug, contestId }: { slug: string; contestId?: string }) =>
      problemsApi.adminRejudgeProblem(slug, contestId),
  })
}
