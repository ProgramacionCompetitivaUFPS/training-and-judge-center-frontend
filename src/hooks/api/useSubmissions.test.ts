import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
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
