import { createElement, type ReactNode } from 'react'
import { vi, expect } from 'vitest'
import { QueryClientProvider, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { server } from '@/mocks/server'
import { createTestQueryClient } from './renderWithProviders'

export const API_URL = 'http://localhost:8080/api'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

export interface CapturedRequest {
  method: string
  /** Path without the /api prefix, e.g. "/groups/group-1/members". */
  path: string
  /** Query string including the leading "?", or "". */
  search: string
  /** Parsed JSON body, or undefined when the request had none. */
  body: unknown
}

/**
 * Registers a one-off MSW handler for `method path` and records every request it receives.
 * With no `body` the endpoint answers an empty response (204 unless `status` says otherwise).
 */
export function stubEndpoint(method: Method, path: string, response: { status?: number; body?: unknown } = {}) {
  const calls: CapturedRequest[] = []
  server.use(
    http[method](`${API_URL}${path}`, async ({ request }) => {
      const text = await request.text()
      const url = new URL(request.url)
      let body: unknown
      try {
        body = text ? JSON.parse(text) : undefined
      } catch {
        body = text
      }
      calls.push({ method: request.method, path: url.pathname.replace('/api', ''), search: url.search, body })
      if (response.body === undefined) return new HttpResponse(null, { status: response.status ?? 204 })
      return HttpResponse.json(response.body as Record<string, unknown>, { status: response.status ?? 200 })
    }),
  )
  return calls
}

function makeClientAndWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

/**
 * Renders a mutation hook with a fresh QueryClient, fires it with `variables`, waits for it to settle and
 * reports the data/error plus the query keys it invalidated.
 */
export async function exerciseMutation<TData, TVars>(
  useHook: () => UseMutationResult<TData, Error, TVars, unknown>,
  variables: NoInfer<TVars>,
) {
  const { queryClient, wrapper } = makeClientAndWrapper()
  const spy = vi.spyOn(queryClient, 'invalidateQueries')
  const { result } = renderHook(() => useHook(), { wrapper })

  result.current.mutate(variables)
  await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true))

  return {
    data: result.current.data,
    error: result.current.error,
    isSuccess: result.current.isSuccess,
    invalidatedKeys: spy.mock.calls.map(([filters]) => filters?.queryKey),
  }
}

/** Renders a query hook with a fresh QueryClient and waits for it to settle. */
export async function exerciseQuery<TData>(useHook: () => UseQueryResult<TData, Error>) {
  const { wrapper } = makeClientAndWrapper()
  const { result } = renderHook(() => useHook(), { wrapper })

  await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true))

  return { data: result.current.data, error: result.current.error, isSuccess: result.current.isSuccess }
}
