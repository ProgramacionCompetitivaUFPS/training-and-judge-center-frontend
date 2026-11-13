import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { mockProblems } from '@/mocks/data'
import type { CreateProblemRequest } from '@/types/problem'
import { problemKeys, useProblems, useProblemDetail, useCreateProblem } from './useProblems'

function makeWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

// Builder — input mínimo válido para CreateProblemRequest
const baseProblem: CreateProblemRequest = {
  slug: 'test-problem',
  title: 'Test Problem',
}

describe('useProblems', () => {
  it('retorna lista paginada con al menos un problema', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProblems(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.total).toBeGreaterThan(0)
    expect(result.current.data?.problems.some((p) => p.slug === mockProblems[0].slug)).toBe(true)
  })

  it('propaga error cuando el servidor responde 500', async () => {
    server.use(
      http.get('http://localhost:8080/api/problems', () =>
        HttpResponse.json({ error: 'SERVER_ERROR', message: 'Error interno' }, { status: 500 }),
      ),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProblems(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useProblemDetail', () => {
  it('retorna el detalle del problema para un slug válido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProblemDetail(mockProblems[0].slug), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.slug).toBe(mockProblems[0].slug)
    expect(result.current.data?.title).toBe(mockProblems[0].title)
  })

  it('no hace fetch cuando el slug está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProblemDetail(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('propaga error 404 para un slug desconocido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProblemDetail('no-existe'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateProblem', () => {
  beforeEach(() => {
    server.use(
      http.post('http://localhost:8080/api/problems', () =>
        HttpResponse.json({ slug: baseProblem.slug, title: baseProblem.title }, { status: 201 }),
      ),
    )
  })

  it('invalida problemKeys.all al crear con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateProblem(), { wrapper })

    // Act
    result.current.mutate(baseProblem)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: problemKeys.all }))
  })
})
