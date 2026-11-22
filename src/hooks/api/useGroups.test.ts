import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { stubEndpoint, exerciseMutation, exerciseQuery, describeMutationCases, type MutationCase } from '@/test/hookHarness'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockGroups, mockMyGroups } from '@/mocks/data'
import type { CreateGroupRequest, UpdateGroupRequest } from '@/types/group'
import {
  groupKeys,
  useGroups,
  useGroupDetail,
  useMyGroups,
  useGroupMembers,
  useJoinRequests,
  useMyJoinRequest,
  useInvitations,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useJoinGroup,
  useProcessJoinRequest,
  useGroupDeletionImpact,
  useCreateJoinRequest,
  useCancelJoinRequest,
  useAddMember,
  useRemoveMember,
  useChangeMemberRole,
  useLeaveGroup,
  useCreateInvitation,
  useAcceptInvitation,
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
    expect(result.current.data?.name).toBe('ICPC Colombia')
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

  it('no hace fetch cuando options.enabled es false', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useGroupMembers('group-1', undefined, { enabled: false }), { wrapper })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('sí hace fetch cuando options.enabled es true explícito', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useGroupMembers('group-1', undefined, { enabled: true }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.members.length).toBeGreaterThan(0)
  })
})

describe('useInvitations', () => {
  it('retorna invitaciones de un grupo válido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useInvitations('group-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.invitations.length).toBeGreaterThan(0)
    expect(result.current.data?.invitations[0].groupId).toBe('group-1')
  })

  it('no hace fetch cuando options.enabled es false', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useInvitations('group-1', undefined, { enabled: false }), { wrapper })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('sí hace fetch cuando options.enabled es true explícito', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useInvitations('group-1', undefined, { enabled: true }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.invitations.length).toBeGreaterThan(0)
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
  it('devuelve request: null cuando el usuario no tiene solicitud', async () => {
    const { wrapper } = makeWrapper()
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/requests/me', () =>
        HttpResponse.json({ request: null }),
      ),
    )
    const { result } = renderHook(() => useMyJoinRequest('group-3'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.request).toBeNull()
  })

  it('devuelve la solicitud cuando el usuario tiene una pendiente', async () => {
    const { wrapper } = makeWrapper()
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/requests/me', () =>
        HttpResponse.json({
          request: {
            id: 'req-1',
            groupId: 'group-3',
            requester: { userId: 'user-1', nickname: 'carloscp', name: 'Carlos' },
            status: 'PENDING',
            createdAt: '2026-01-01T00:00:00Z',
          },
        }),
      ),
    )
    const { result } = renderHook(() => useMyJoinRequest('group-3'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.request?.status).toBe('PENDING')
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

// ---------------------------------------------------------------------------
// Mutaciones de miembros, solicitudes e invitaciones
// ---------------------------------------------------------------------------

const GROUP_MUTATION_CASES: MutationCase[] = [
  {
    name: 'useCreateJoinRequest',
    run: () => exerciseMutation(useCreateJoinRequest, { groupId: 'group-1', data: { message: 'Quiero unirme' } }),
    method: 'post',
    path: '/groups/group-1/requests',
    requestBody: { message: 'Quiero unirme' },
    respond: { status: 201, body: { id: 'req-1', status: 'PENDING' } },
    invalidates: [['groups', 'detail', 'group-1'], ['groups', 'group-1', 'requests', 'me']],
  },
  {
    name: 'useCancelJoinRequest',
    run: () => exerciseMutation(useCancelJoinRequest, 'group-1'),
    method: 'delete',
    path: '/groups/group-1/requests/me',
    requestBody: undefined,
    respond: {},
    invalidates: [['groups']],
  },
  {
    name: 'useAddMember',
    run: () => exerciseMutation(useAddMember, { groupId: 'group-1', data: { nickname: 'ana', role: 'MEMBER' } }),
    method: 'post',
    path: '/groups/group-1/members',
    requestBody: { nickname: 'ana', role: 'MEMBER' },
    respond: { status: 201, body: { nickname: 'ana', role: 'MEMBER' } },
    invalidates: [['groups', 'group-1', 'members'], ['groups', 'detail', 'group-1']],
  },
  {
    name: 'useRemoveMember',
    run: () => exerciseMutation(useRemoveMember, { groupId: 'group-1', nickname: 'ana' }),
    method: 'delete',
    path: '/groups/group-1/members/ana',
    requestBody: undefined,
    respond: {},
    invalidates: [['groups', 'group-1', 'members'], ['groups', 'detail', 'group-1']],
  },
  {
    name: 'useChangeMemberRole',
    run: () => exerciseMutation(useChangeMemberRole, { groupId: 'group-1', nickname: 'ana', data: { role: 'LEAD' } }),
    method: 'patch',
    path: '/groups/group-1/members/ana',
    requestBody: { role: 'LEAD' },
    respond: { body: { nickname: 'ana', role: 'LEAD' } },
    invalidates: [['groups', 'group-1', 'members'], ['groups', 'detail', 'group-1']],
  },
  {
    name: 'useLeaveGroup',
    run: () => exerciseMutation(useLeaveGroup, 'group-1'),
    method: 'delete',
    path: '/groups/group-1/members/me',
    requestBody: undefined,
    respond: {},
    invalidates: [['groups']],
  },
  {
    name: 'useCreateInvitation',
    run: () => exerciseMutation(useCreateInvitation, { groupId: 'group-1', data: { userNickname: 'ana' } }),
    method: 'post',
    path: '/groups/group-1/invitations',
    requestBody: { userNickname: 'ana' },
    respond: { status: 201, body: { id: 'inv-1', status: 'PENDING' } },
    invalidates: [['groups', 'detail', 'group-1'], ['groups', 'group-1', 'invitations']],
  },
  {
    name: 'useAcceptInvitation',
    run: () => exerciseMutation(useAcceptInvitation, { groupId: 'group-1', invitationId: 'inv-1' }),
    method: 'post',
    path: '/groups/group-1/invitations/accept',
    requestBody: { invitationId: 'inv-1' },
    respond: {},
    invalidates: [['groups'], ['groups', 'detail', 'group-1']],
  },
]

describeMutationCases('mutaciones de grupos (miembros, solicitudes, invitaciones)', GROUP_MUTATION_CASES)

describe('useGroupDeletionImpact', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it('retorna el impacto de eliminar el grupo', async () => {
    stubEndpoint('get', '/groups/group-1/deletion-impact', {
      body: { contests: 3, activeContests: 1, materials: 4, members: 12, submissions: 90 },
    })

    const { data } = await exerciseQuery(() => useGroupDeletionImpact('group-1', true))

    expect(data).toEqual({ contests: 3, activeContests: 1, materials: 4, members: 12, submissions: 90 })
  })

  it('no hace fetch cuando enabled es false', async () => {
    const calls = stubEndpoint('get', '/groups/group-1/deletion-impact', { body: {} })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => useGroupDeletionImpact('group-1', false), { wrapper })
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(result.current.fetchStatus).toBe('idle')
    expect(calls).toHaveLength(0)
  })
})
