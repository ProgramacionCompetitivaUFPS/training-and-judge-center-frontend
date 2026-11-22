import { createElement, type ReactNode } from 'react'
import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest'
import { QueryClientProvider, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { server } from '@/mocks/server'
import { ApiClientError } from '@/lib/errors'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
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

export interface MutationCase {
  /** Hook name, used in the test titles. */
  name: string
  run: () => ReturnType<typeof exerciseMutation>
  method: Method
  /** Path without the /api prefix. */
  path: string
  /** Expected JSON body of the request (undefined when the request has none). */
  requestBody: unknown
  /** What the stubbed endpoint answers on success. */
  respond: { status?: number; body?: unknown }
  /** Query keys the mutation must invalidate, in order. */
  invalidates: unknown[]
  /** Keys still invalidated when the server rejects the request (e.g. an onSettled refresh). Default: none. */
  invalidatesOnError?: unknown[]
}

/**
 * Registers, for every case, one success test (right method/path/body, right invalidations, response data)
 * and one failure test (a 403 surfaces as ApiClientError and nothing is invalidated).
 */
export function describeMutationCases(title: string, cases: MutationCase[]) {
  describe(title, () => {
    beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
    afterEach(() => clearAccessToken())

    it.each(cases)('$name envía $method $path con el cuerpo esperado e invalida las claves correctas', async (c) => {
      const calls = stubEndpoint(c.method, c.path, c.respond)

      const outcome = await c.run()

      expect(outcome.isSuccess).toBe(true)
      expect(calls).toHaveLength(1)
      expect(calls[0].method.toLowerCase()).toBe(c.method)
      expect(calls[0].body).toEqual(c.requestBody)
      expect(outcome.data).toEqual(c.respond.body)
      expect(outcome.invalidatedKeys).toEqual(c.invalidates)
    })

    it.each(cases)('$name propaga ApiClientError 403 e invalida solo lo que corresponde cuando el servidor rechaza', async (c) => {
      stubEndpoint(c.method, c.path, { status: 403, body: { error: 'FORBIDDEN', message: 'sin permiso' } })

      const outcome = await c.run()

      expect(outcome.isSuccess).toBe(false)
      expect(outcome.error).toBeInstanceOf(ApiClientError)
      expect((outcome.error as ApiClientError).status).toBe(403)
      expect(outcome.invalidatedKeys).toEqual(c.invalidatesOnError ?? [])
    })
  })
}

/**
 * MSW does not see XMLHttpRequest in this setup, so uploads that use postFormDataWithProgress are exercised
 * with a stub XHR that answers right away. Returns what was sent.
 */
export function stubXhr(response: { status: number; body?: unknown }) {
  const sent: Array<{ method: string; url: string; body: unknown }> = []
  class StubXhr {
    withCredentials = false
    timeout = 0
    status = 0
    statusText = ''
    responseText = ''
    upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null }
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    ontimeout: (() => void) | null = null
    private method = ''
    private url = ''
    open(method: string, url: string) {
      this.method = method
      this.url = url
    }
    setRequestHeader() {}
    send(body: unknown) {
      sent.push({ method: this.method, url: this.url, body })
      this.status = response.status
      this.responseText = response.body === undefined ? '' : JSON.stringify(response.body)
      queueMicrotask(() => this.onload?.())
    }
  }
  vi.stubGlobal('XMLHttpRequest', StubXhr)
  return sent
}
