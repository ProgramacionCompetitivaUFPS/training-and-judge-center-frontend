import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockProblems } from '@/mocks/data'
import {
  submissionKeys,
  useMySubmissions,
  useProblemSubmissions,
  useUpdateSubmissionVisibility,
  useSubmissionDetail,
  useRejudgeSubmission,
  useAdminRejudgeSubmission,
  useSubmitSolution,
  useSubmitContestSolution,
  useSubmitBlocklySolution,
  useSubmitBlocklyContestSolution,
} from './useSubmissions'

function makeWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
afterEach(() => clearAccessToken())

describe('useMySubmissions', () => {
  it('retorna lista paginada de envíos del usuario autenticado', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMySubmissions(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.total).toBeGreaterThan(0)
    expect(result.current.data?.submissions.some((s) => s.id === 'sub-008-aaaa-bbbb-cccc-ddddeeee0008')).toBe(true)
  })

  it('propaga error cuando el servidor responde 500', async () => {
    server.use(
      http.get('http://localhost:8080/api/users/me/submissions', () =>
        HttpResponse.json({ error: 'SERVER_ERROR', message: 'Error interno' }, { status: 500 }),
      ),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMySubmissions(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useProblemSubmissions', () => {
  it('retorna envíos para un slug de problema válido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProblemSubmissions(mockProblems[0].slug), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.total).toBeGreaterThan(0)
    expect(result.current.data?.submissions.some((s) => s.id === 'sub-001-aaaa-bbbb-cccc-ddddeeee0001')).toBe(true)
  })

  it('no hace fetch cuando el slug está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProblemSubmissions(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})

describe('useUpdateSubmissionVisibility', () => {
  it('invalida las claves de detalle y globales al actualizar con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateSubmissionVisibility(), { wrapper })

    // Act
    result.current.mutate({ id: 'sub-006-aaaa-bbbb-cccc-ddddeeee0006', data: { visibility: 'PUBLIC' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(result.current.data?.visibility).toBe('PUBLIC')
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: submissionKeys.detail('sub-006-aaaa-bbbb-cccc-ddddeeee0006') }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: submissionKeys.all }),
    )
  })
})

describe('useSubmissionDetail', () => {
  it('retorna el detalle de un envío para un id válido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useSubmissionDetail('sub-001-aaaa-bbbb-cccc-ddddeeee0001'),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe('sub-001-aaaa-bbbb-cccc-ddddeeee0001')
  })

  it('no hace fetch cuando el id está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSubmissionDetail(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useRejudgeSubmission', () => {
  beforeEach(() => {
    server.use(
      http.post('http://localhost:8080/api/submissions/:id/rejudge', ({ params }) => {
        const { id } = params as { id: string }
        return HttpResponse.json({ id, status: 'PENDING' })
      }),
    )
  })

  it('invalida el detalle y submissionKeys.all al rejuzgar', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRejudgeSubmission(), { wrapper })

    result.current.mutate('sub-001-aaaa-bbbb-cccc-ddddeeee0001')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: submissionKeys.detail('sub-001-aaaa-bbbb-cccc-ddddeeee0001') }),
    )
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: submissionKeys.all }))
  })
})

describe('useAdminRejudgeSubmission', () => {
  beforeEach(() => {
    server.use(
      http.post('http://localhost:8080/api/admin/submissions/:id/rejudge', ({ params }) => {
        const { id } = params as { id: string }
        return HttpResponse.json({ id, status: 'PENDING' })
      }),
    )
  })

  it('invalida el detalle y submissionKeys.all al rejuzgar como admin', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useAdminRejudgeSubmission(), { wrapper })

    result.current.mutate('sub-001-aaaa-bbbb-cccc-ddddeeee0001')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: submissionKeys.detail('sub-001-aaaa-bbbb-cccc-ddddeeee0001') }),
    )
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: submissionKeys.all }))
  })
})

const API = 'http://localhost:8080/api'

function judgedListBody(statuses: string[]) {
  return {
    submissions: statuses.map((status, i) => ({
      id: `sub-${i}`,
      status,
      language: 'cpp20',
      problem: { slug: 'two-sum', title: 'Two Sum' },
    })),
    pagination: { page: 1, limit: 20, total: statuses.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
  }
}

describe('polling del veredicto', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('useSubmissionDetail vuelve a pedir el envío cada 3 s mientras está PENDING y se detiene al llegar el veredicto', async () => {
    // Arrange: PENDING, RUNNING, then ACCEPTED
    const sequence = ['PENDING', 'RUNNING', 'ACCEPTED']
    let requests = 0
    server.use(
      http.get(`${API}/submissions/sub-poll`, () => {
        const status = sequence[Math.min(requests, sequence.length - 1)]
        requests += 1
        return HttpResponse.json({ id: 'sub-poll', status, language: 'cpp20' })
      }),
    )
    const { wrapper } = makeWrapper()

    // Act
    const { result } = renderHook(() => useSubmissionDetail('sub-poll'), { wrapper })
    await waitFor(() => expect(result.current.data?.status).toBe('PENDING'))
    await act(() => vi.advanceTimersByTimeAsync(3_100))
    await act(() => vi.advanceTimersByTimeAsync(3_100))

    // Assert: the verdict arrived after exactly 3 requests...
    await waitFor(() => expect(result.current.data?.status).toBe('ACCEPTED'))
    expect(requests).toBe(3)
    // ...and polling stopped: no more requests after a terminal status
    await act(() => vi.advanceTimersByTimeAsync(10_000))
    expect(requests).toBe(3)
  })

  it('useMySubmissions sigue pidiendo la lista mientras algún envío está RUNNING y para cuando todos están juzgados', async () => {
    const responses = [['ACCEPTED', 'RUNNING'], ['ACCEPTED', 'WRONG_ANSWER']]
    let requests = 0
    server.use(
      http.get(`${API}/users/me/submissions`, () => {
        const statuses = responses[Math.min(requests, responses.length - 1)]
        requests += 1
        return HttpResponse.json(judgedListBody(statuses))
      }),
    )
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => useMySubmissions(), { wrapper })
    await waitFor(() => expect(result.current.data?.submissions[1].status).toBe('RUNNING'))
    await act(() => vi.advanceTimersByTimeAsync(3_100))

    await waitFor(() => expect(result.current.data?.submissions[1].status).toBe('WRONG_ANSWER'))
    expect(requests).toBe(2)
    await act(() => vi.advanceTimersByTimeAsync(10_000))
    expect(requests).toBe(2)
  })

  it('useProblemSubmissions no vuelve a pedir la lista cuando todos los envíos ya tienen veredicto', async () => {
    let requests = 0
    server.use(
      http.get(`${API}/problems/p/two-sum/submissions`, () => {
        requests += 1
        return HttpResponse.json(judgedListBody(['ACCEPTED', 'TIME_LIMIT_EXCEEDED']))
      }),
    )
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => useProblemSubmissions('two-sum'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => vi.advanceTimersByTimeAsync(10_000))

    expect(requests).toBe(1)
  })
})

describe('mutaciones de envío', () => {
  const file = new File(['int main(){}'], 'sol.cpp')

  it('useSubmitSolution devuelve el envío PENDING e invalida submissionKeys.all', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useSubmitSolution(), { wrapper })

    result.current.mutate({ problemSlug: 'two-sum', file, language: 'cpp20', compiler: 'g++' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.status).toBe('PENDING')
    expect(result.current.data?.problem.slug).toBe('two-sum')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: submissionKeys.all }))
  })

  it('useSubmitSolution no invalida la caché cuando el servidor rechaza el envío', async () => {
    server.use(
      http.post(`${API}/problems/p/two-sum/submissions`, () =>
        HttpResponse.json({ error: 'PROBLEM_NOT_PUBLISHED', message: 'no publicado' }, { status: 400 }),
      ),
    )
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useSubmitSolution(), { wrapper })

    result.current.mutate({ problemSlug: 'two-sum', file, language: 'cpp20', compiler: 'g++' })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(spy).not.toHaveBeenCalled()
  })

  it('useSubmitContestSolution devuelve el envío e invalida submissionKeys.all', async () => {
    server.use(
      http.post(`${API}/groups/group-1/contests/contest-2/problems/two-sum/submissions`, () =>
        HttpResponse.json({ id: 'sub-c1', status: 'PENDING' }, { status: 201 }),
      ),
    )
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useSubmitContestSolution(), { wrapper })

    result.current.mutate({
      groupId: 'group-1',
      contestId: 'contest-2',
      problemSlug: 'two-sum',
      file,
      language: 'cpp20',
      compiler: 'g++',
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe('sub-c1')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: submissionKeys.all }))
  })

  it('useSubmitBlocklySolution devuelve el envío e invalida las claves de submissions', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useSubmitBlocklySolution(), { wrapper })

    result.current.mutate({ problemSlug: 'two-sum', pythonCode: 'print(1)', workspaceXml: '<xml/>' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.status).toBe('PENDING')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['submissions'] }))
  })

  it('useSubmitBlocklyContestSolution devuelve el envío e invalida las claves de submissions', async () => {
    server.use(
      http.post(`${API}/groups/group-1/contests/contest-2/problems/two-sum/submissions`, () =>
        HttpResponse.json({ id: 'sub-bc1', status: 'PENDING' }, { status: 201 }),
      ),
    )
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useSubmitBlocklyContestSolution(), { wrapper })

    result.current.mutate({
      groupId: 'group-1',
      contestId: 'contest-2',
      problemSlug: 'two-sum',
      pythonCode: 'print(2)',
      workspaceXml: '<xml/>',
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe('sub-bc1')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['submissions'] }))
  })
})
