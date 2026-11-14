import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockGroups, mockGroupDetails, mockMyGroups } from '@/mocks/data'
import type { CreateGroupRequest, UpdateGroupRequest } from '@/types/group'
import {
  groupKeys,
  useGroups,
  useGroupDetail,
  useMyGroups,
  useGroupMembers,
  useJoinRequests,
  useMyJoinRequest,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useJoinGroup,
  useProcessJoinRequest,
} from './useGroups'

function makeWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

const baseGroup: CreateGroupRequest = { name: 'Nuevo Grupo', visibility: 'VISIBLE', joinPolicy: 'OPEN' }
const baseUpdate: UpdateGroupRequest = { name: 'Grupo Actualizado' }

beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
afterEach(() => clearAccessToken())

describe('useGroups', () => {
  it('retorna lista paginada con al menos un grupo', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useGroups(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.total).toBeGreaterThan(0)
    expect(result.current.data?.groups.some((g) => g.id === mockGroups[0].id)).toBe(true)
  })

  it('propaga error cuando el servidor responde 500', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups', () =>
        HttpResponse.json({ error: 'SERVER_ERROR', message: 'Error interno' }, { status: 500 }),
      ),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useGroups(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useGroupDetail', () => {
  it('retorna el detalle del grupo para un id válido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useGroupDetail('group-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe('group-1')
    expect(result.current.data?.name).toBe(mockGroupDetails['group-1'].name)
  })

  it('no hace fetch cuando id está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useGroupDetail(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('propaga error 404 para un id desconocido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useGroupDetail('no-existe'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useMyGroups', () => {
  it('retorna los grupos del usuario autenticado', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMyGroups(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.total).toBeGreaterThan(0)
    expect(result.current.data?.groups.some((g) => g.id === mockMyGroups[0].id)).toBe(true)
  })
})

describe('useGroupMembers', () => {
  it('retorna los miembros de un grupo válido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useGroupMembers('group-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.members.length).toBeGreaterThan(0)
    expect(result.current.data?.members.some((m) => m.nickname === 'luisadmin')).toBe(true)
  })

  it('no hace fetch cuando groupId está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useGroupMembers(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useJoinRequests', () => {
  it('retorna solicitudes de un grupo válido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useJoinRequests('group-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const requests = result.current.data?.requests ?? []
    expect(requests.length).toBeGreaterThan(0)
    expect(requests[0].groupId).toBe('group-1')
  })

  it('no hace fetch cuando groupId está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useJoinRequests(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useMyJoinRequest', () => {
  it('no reintenta en 404 aunque el QueryClient tenga retry habilitado', async () => {
    // Arrange — custom client with retry: 2 so the hook's own retry: false is what stops retries
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: 2, staleTime: 0 }, mutations: { retry: false } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/requests/me', () =>
        HttpResponse.json({ error: 'NOT_FOUND', message: 'Sin solicitud' }, { status: 404 }),
      ),
    )

    // Act
    const { result } = renderHook(() => useMyJoinRequest('group-3'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Assert — exactly 1 attempt: hook's retry: false overrides the client's retry: 2
    expect(queryClient.getQueryState(
      [...groupKeys.joinRequests('group-3'), 'me']
    )?.fetchFailureCount).toBe(1)
  })
})

describe('useCreateGroup', () => {
  beforeEach(() => {
    server.use(
      http.post('http://localhost:8080/api/groups', () =>
        HttpResponse.json({ id: 'group-new', ...baseGroup }, { status: 201 }),
      ),
    )
  })

  it('invalida groupKeys.all al crear con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateGroup(), { wrapper })

    // Act
    result.current.mutate(baseGroup)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(result.current.data?.name).toBe('Nuevo Grupo')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: groupKeys.all }))
  })
})

describe('useUpdateGroup', () => {
  beforeEach(() => {
    server.use(
      http.patch('http://localhost:8080/api/groups/:id', () =>
        HttpResponse.json({ id: 'group-1', ...baseUpdate }),
      ),
    )
  })

  it('invalida groupKeys.all y groupKeys.detail al actualizar con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateGroup(), { wrapper })

    // Act
    result.current.mutate({ id: 'group-1', data: baseUpdate })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(result.current.data?.name).toBe('Grupo Actualizado')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: groupKeys.all }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: groupKeys.detail('group-1') }))
  })
})

describe('useDeleteGroup', () => {
  beforeEach(() => {
    server.use(
      http.delete('http://localhost:8080/api/groups/:id', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )
  })

  it('invalida groupKeys.all al eliminar con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteGroup(), { wrapper })

    // Act
    result.current.mutate({ id: 'group-1', data: { confirmationName: 'ICPC Colombia' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: groupKeys.all }))
  })
})

describe('useJoinGroup', () => {
  beforeEach(() => {
    server.use(
      http.post('http://localhost:8080/api/groups/:id/join', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )
  })

  it('invalida groupKeys.all al unirse con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useJoinGroup(), { wrapper })

    // Act
    result.current.mutate('group-3')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: groupKeys.all }))
  })
})

describe('useProcessJoinRequest', () => {
  beforeEach(() => {
    server.use(
      http.patch('http://localhost:8080/api/groups/:groupId/requests/:requestId', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )
  })

  it('invalida joinRequests, members y detail al procesar con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useProcessJoinRequest(), { wrapper })

    // Act
    result.current.mutate({ groupId: 'group-1', requestId: 'req-1', data: { status: 'APPROVED' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: groupKeys.joinRequests('group-1') }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: groupKeys.members('group-1') }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: groupKeys.detail('group-1') }))
  })
})
