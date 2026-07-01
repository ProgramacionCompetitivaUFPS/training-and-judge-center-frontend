import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as submissionsApi from '@/api/submissions'
import {
  submitBlocklySolution,
  submitBlocklyContestSolution,
} from '@/api/submissions'
import type {
  MySubmissionsParams,
  ProblemSubmissionsParams,
  UpdateVisibilityRequest,
} from '@/types/submission'

// === Query Keys ===

export const submissionKeys = {
  all: ['submissions'] as const,
  myList: (params?: MySubmissionsParams) => ['submissions', 'my', params] as const,
  problemList: (slug: string, params?: ProblemSubmissionsParams) =>
    ['submissions', 'problem', slug, params] as const,
  detail: (id: string) => ['submissions', 'detail', id] as const,
}

// === Queries ===

export function useMySubmissions(params?: MySubmissionsParams) {
  return useQuery({
    queryKey: submissionKeys.myList(params),
    queryFn: () => submissionsApi.getMySubmissions(params),
  })
}

export function useProblemSubmissions(slug: string, params?: ProblemSubmissionsParams) {
  return useQuery({
    queryKey: submissionKeys.problemList(slug, params),
    queryFn: () => submissionsApi.getProblemSubmissions(slug, params),
    enabled: !!slug,
  })
}

export function useSubmissionDetail(id: string) {
  return useQuery({
    queryKey: submissionKeys.detail(id),
    queryFn: () => submissionsApi.getSubmission(id),
    enabled: !!id,
  })
}

// === Mutations ===

export function useSubmitSolution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      problemSlug,
      file,
      language,
      compiler,
    }: {
      problemSlug: string
      file: File
      language: string
      compiler: string
    }) => submissionsApi.submitSolution(problemSlug, file, language, compiler),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.all })
    },
  })
}

export function useSubmitContestSolution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      groupId,
      contestId,
      problemSlug,
      file,
      language,
      compiler,
    }: {
      groupId: string
      contestId: string
      problemSlug: string
      file: File
      language: string
      compiler: string
    }) =>
      submissionsApi.submitContestSolution(groupId, contestId, problemSlug, file, language, compiler),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.all })
    },
  })
}

export function useUpdateSubmissionVisibility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVisibilityRequest }) =>
      submissionsApi.updateSubmissionVisibility(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: submissionKeys.all })
    },
  })
}

// === Rejudge ===

export function useRejudgeSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (submissionId: string) => submissionsApi.rejudgeSubmission(submissionId),
    onSuccess: (_, submissionId) => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.detail(submissionId) })
      queryClient.invalidateQueries({ queryKey: submissionKeys.all })
    },
  })
}

export function useAdminRejudgeSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (submissionId: string) => submissionsApi.adminRejudgeSubmission(submissionId),
    onSuccess: (_, submissionId) => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.detail(submissionId) })
      queryClient.invalidateQueries({ queryKey: submissionKeys.all })
    },
  })
}

// === Blockly Mutations ===

export function useSubmitBlocklySolution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      problemSlug: string
      pythonCode: string
      workspaceXml: string
      svgBlob: Blob
    }) =>
      submitBlocklySolution(
        params.problemSlug,
        params.pythonCode,
        params.workspaceXml,
        params.svgBlob,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] })
    },
  })
}

export function useSubmitBlocklyContestSolution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      groupId: string
      contestId: string
      problemSlug: string
      pythonCode: string
      workspaceXml: string
      svgBlob: Blob
    }) =>
      submitBlocklyContestSolution(
        params.groupId,
        params.contestId,
        params.problemSlug,
        params.pythonCode,
        params.workspaceXml,
        params.svgBlob,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] })
    },
  })
}
