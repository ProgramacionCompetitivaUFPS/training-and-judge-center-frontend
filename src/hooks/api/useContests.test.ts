import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockContests } from '@/mocks/data'
import type { CreateContestRequest } from '@/types/contest'
import {
  contestKeys,
  useMyContests,
  useContests,
  useContestDetail,
  useCreateContest,
} from './useContests'

function makeWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

// Builder — input mínimo válido para CreateContestRequest
const baseContest: CreateContestRequest = {
  name: 'Nuevo Concurso',
  startTime: '2026-12-01T10:00:00Z',
  endTime: '2026-12-01T14:00:00Z',
}

beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
afterEach(() => clearAccessToken())

describe('useMyContests', () => {
  it('retorna lista paginada de concursos accesibles', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMyContests(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.total).toBeGreaterThan(0)
    expect(result.current.data?.items.length).toBeGreaterThan(0)
  })

  it('propaga error cuando el servidor responde 500', async () => {
    server.use(
      http.get('http://localhost:8080/api/contests', () =>
        HttpResponse.json({ error: 'SERVER_ERROR', message: 'Error interno' }, { status: 500 }),
      ),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMyContests(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useContests', () => {
  it('retorna concursos del grupo con al menos un item conocido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useContests(mockContests[0].group.id), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.total).toBeGreaterThan(0)
    expect(result.current.data?.items.some((c) => c.id === mockContests[0].id)).toBe(true)
  })

  it('no hace fetch cuando groupId está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useContests(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})

describe('useContestDetail', () => {
  it('retorna el detalle del concurso para IDs válidos', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useContestDetail(mockContests[0].group.id, mockContests[0].id),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe(mockContests[0].id)
    expect(result.current.data?.name).toBe(mockContests[0].name)
  })

  it('no hace fetch cuando groupId está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useContestDetail('', mockContests[0].id), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })

  it('propaga error 404 para un contestId desconocido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useContestDetail(mockContests[0].group.id, 'no-existe'),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateContest', () => {
  beforeEach(() => {
    server.use(
      http.post('http://localhost:8080/api/groups/:groupId/contests', () =>
        HttpResponse.json({ id: 'contest-new', name: baseContest.name }, { status: 201 }),
      ),
    )
  })

  it('invalida contestKeys.all al crear con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateContest(), { wrapper })

    // Act
    result.current.mutate({ groupId: mockContests[0].group.id, data: baseContest })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: contestKeys.all }))
  })
})
