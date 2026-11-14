import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockProblems } from '@/mocks/data'
import { useSubmissionRecovery } from './useSubmissionRecovery'

function makeWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
afterEach(() => clearAccessToken())

describe('useSubmissionRecovery', () => {
  it('retorna null cuando no hay envíos que coincidan con el language', async () => {
    // Empty submissions response
    server.use(
      http.get('http://localhost:8080/api/users/me/submissions', () =>
        HttpResponse.json({
          submissions: [],
          pagination: { page: 1, limit: 5, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        }),
      ),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useSubmissionRecovery({ problemSlug: mockProblems[0].slug, language: 'cpp20' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.recoverableSubmission).toBeNull()
  })

  it('retorna el envío más reciente que coincida con language y problemSlug', async () => {
    server.use(
      http.get('http://localhost:8080/api/users/me/submissions', () =>
        HttpResponse.json({
          submissions: [
            {
              id: 'sub-rec-1',
              problemSlug: mockProblems[0].slug,
              language: 'python310',
              status: 'ACCEPTED',
              submittedAt: '2026-10-01T10:00:00Z',
              contest: null,
              visibility: 'PRIVATE',
            },
            {
              id: 'sub-rec-2',
              problemSlug: mockProblems[0].slug,
              language: 'python310',
              status: 'WRONG_ANSWER',
              submittedAt: '2026-10-02T10:00:00Z',
              contest: null,
              visibility: 'PRIVATE',
            },
          ],
          pagination: { page: 1, limit: 5, total: 2, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        }),
      ),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useSubmissionRecovery({ problemSlug: mockProblems[0].slug, language: 'python310' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.recoverableSubmission).not.toBeNull())

    // Should return the most recent one (sub-rec-2)
    expect(result.current.recoverableSubmission?.id).toBe('sub-rec-2')
    expect(result.current.recoverableSubmission?.language).toBe('python310')
  })

  it('filtra por contestId cuando se proporciona', async () => {
    server.use(
      http.get('http://localhost:8080/api/users/me/submissions', () =>
        HttpResponse.json({
          submissions: [
            {
              id: 'sub-contest',
              problemSlug: mockProblems[0].slug,
              language: 'cpp20',
              status: 'ACCEPTED',
              submittedAt: '2026-10-01T10:00:00Z',
              contest: { id: 'contest-1', name: 'Concurso' },
              visibility: 'PRIVATE',
            },
            {
              id: 'sub-open',
              problemSlug: mockProblems[0].slug,
              language: 'cpp20',
              status: 'ACCEPTED',
              submittedAt: '2026-10-02T10:00:00Z',
              contest: null,
              visibility: 'PRIVATE',
            },
          ],
          pagination: { page: 1, limit: 5, total: 2, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        }),
      ),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        useSubmissionRecovery({
          problemSlug: mockProblems[0].slug,
          language: 'cpp20',
          contestId: 'contest-1',
        }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.recoverableSubmission).not.toBeNull())

    // Should return only the submission from contest-1
    expect(result.current.recoverableSubmission?.id).toBe('sub-contest')
  })

  it('loadSubmission dispara fetch del detalle', async () => {
    server.use(
      http.get('http://localhost:8080/api/users/me/submissions', () =>
        HttpResponse.json({
          submissions: [
            {
              id: 'sub-detail-test',
              problemSlug: mockProblems[0].slug,
              language: 'python310',
              status: 'ACCEPTED',
              submittedAt: '2026-10-01T10:00:00Z',
              contest: null,
              visibility: 'PRIVATE',
            },
          ],
          pagination: { page: 1, limit: 5, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        }),
      ),
      http.get('http://localhost:8080/api/submissions/:id', ({ params }) => {
        const { id } = params as { id: string }
        return HttpResponse.json({
          id,
          problemSlug: mockProblems[0].slug,
          language: 'python310',
          status: 'ACCEPTED',
          code: 'print("hello")',
          submittedAt: '2026-10-01T10:00:00Z',
        })
      }),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useSubmissionRecovery({ problemSlug: mockProblems[0].slug, language: 'python310' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.recoverableSubmission).not.toBeNull())

    act(() => result.current.loadSubmission('sub-detail-test'))

    await waitFor(() => expect(result.current.submissionDetail).toBeDefined())

    expect(result.current.submissionDetail?.id).toBe('sub-detail-test')
  })
})
