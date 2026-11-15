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
  useRegistrationStatus,
  useRegistrations,
  useStandings,
  useStandingsFilterOptions,
  useContestSubmissions,
  useUpdateContest,
  useDeleteContest,
  useRegisterToContest,
  useUnregisterFromContest,
} from './useContests'

function makeWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

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
    expect(result.current.data?.items.some((c) => c.id === 'contest-1')).toBe(true)
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

    expect(result.current.data?.id).toBe('contest-1')
    expect(result.current.data?.name).toBe('Competencia Semanal #12')
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
    expect(result.current.data?.name).toBe('Nuevo Concurso')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: contestKeys.all }))
  })
})

describe('useMyContests paginación', () => {
  it('mantiene visible la página anterior mientras carga la siguiente', async () => {
    // Arrange
    const { wrapper } = makeWrapper()
    const { result, rerender } = renderHook(
      ({ page }) => useMyContests({ page, limit: 1 }),
      { wrapper, initialProps: { page: 1 } },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const firstPageId = result.current.data?.items[0].id

    // Act
    rerender({ page: 2 })

    // Assert: the list is not replaced by a loading state in between
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data?.pagination.page).toBe(1)
    expect(result.current.data?.items[0].id).toBe(firstPageId)

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false))
    expect(result.current.data?.pagination.page).toBe(2)
    expect(result.current.data?.items[0].id).not.toBe(firstPageId)
  })
})

describe('useRegistrationStatus', () => {
  it('retorna el estado de inscripción para IDs válidos', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRegistrationStatus('group-1', 'contest-2'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.registered).toBe(true)
  })

  it('no hace fetch cuando algún ID está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRegistrationStatus('', 'contest-1'), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useRegistrations', () => {
  it('retorna lista de registros individuales con total y nickname conocido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRegistrations('group-1', 'contest-2'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.total).toBe(7)
    expect(result.current.data?.registrations.some((r) => r.nickname === 'luisadmin')).toBe(true)
  })

  it('no hace fetch cuando groupId está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRegistrations('', 'contest-1'), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useStandings', () => {
  it('retorna tabla de posiciones con al menos un entry conocido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandings('group-1', 'contest-2'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(
      result.current.data?.standings.some((e) => e.participant.displayName === 'Competitive Coders'),
    ).toBe(true)
  })

  it('no hace fetch cuando algún ID está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandings('', 'contest-2'), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useStandingsFilterOptions', () => {
  it('retorna opciones de filtro con países conocidos de mockStandings', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandingsFilterOptions('group-1', 'contest-2'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.countries[0]).toBe('Argentina')
    expect(result.current.data?.countries).toContain('Chile')
  })
})

describe('useContestSubmissions', () => {
  it('retorna envíos del concurso con el ID del concurso y el ID del primer envío correctos', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useContestSubmissions('group-1', 'contest-2'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.contest.id).toBe('contest-2')
    expect(result.current.data?.submissions[0].id).toBe('csub-004')
  })

  it('no hace fetch cuando algún ID está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useContestSubmissions('group-1', ''), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useUpdateContest', () => {
  it('retorna el nombre actualizado, siembra el cache de detalle y marca contestKeys.all como stale', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateContest(), { wrapper })

    result.current.mutate({ groupId: 'group-1', contestId: 'contest-1', data: { name: 'Nombre Actualizado' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.name).toBe('Nombre Actualizado')
    const cached = queryClient.getQueryData(contestKeys.detail('group-1', 'contest-1'))
    expect((cached as { name?: string })?.name).toBe('Nombre Actualizado')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: contestKeys.all }))
  })
})

describe('useDeleteContest', () => {
  it('invalida contestKeys.all al eliminar con éxito', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteContest(), { wrapper })

    result.current.mutate({ groupId: 'group-1', contestId: 'contest-1' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: contestKeys.all }))
  })
})

describe('useRegisterToContest', () => {
  it('invalida registrationStatus, contestDetail y registrations al registrarse', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRegisterToContest(), { wrapper })

    result.current.mutate({ groupId: 'group-1', contestId: 'contest-1' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: contestKeys.registrationStatus('group-1', 'contest-1') }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: contestKeys.detail('group-1', 'contest-1') }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contests', 'registrations', 'group-1', 'contest-1'] }),
    )
  })
})

describe('useUnregisterFromContest', () => {
  it('invalida registrationStatus, contestDetail y registrations al darse de baja', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUnregisterFromContest(), { wrapper })

    result.current.mutate({ groupId: 'group-1', contestId: 'contest-1' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: contestKeys.registrationStatus('group-1', 'contest-1') }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: contestKeys.detail('group-1', 'contest-1') }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contests', 'registrations', 'group-1', 'contest-1'] }),
    )
  })
})
