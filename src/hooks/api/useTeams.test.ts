import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockMyTeams, mockTeamRegistrations } from '@/mocks/data'
import { ApiClientError } from '@/lib/errors'
import type { CreateTeamRequest } from '@/types/team'
import { contestKeys } from './useContests'
import {
  teamKeys,
  useMyTeams,
  useTeamDetail,
  useMyTeamInvitations,
  useContestTeamRegistrations,
  useCreateTeam,
  useLeaveTeam,
  useRenameTeam,
  useRemoveTeamMember,
  useTeamLeaveImpact,
  useAcceptTeamInvitation,
  useRejectTeamInvitation,
  useRegisterTeamToContest,
} from './useTeams'

function makeWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

const baseTeam: CreateTeamRequest = { name: 'Nuevo Equipo Test' }

beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
afterEach(() => clearAccessToken())

describe('useMyTeams', () => {
  it('retorna los equipos del usuario autenticado', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMyTeams(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.total).toBeGreaterThan(0)
    expect(result.current.data?.teams.some((t) => t.id === mockMyTeams[0].id)).toBe(true)
  })
})

describe('useTeamDetail', () => {
  it('retorna el detalle del equipo para un id válido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTeamDetail('team-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe('team-1')
    expect(result.current.data?.name).toBe('Competitive Coders')
  })

  it('no hace fetch cuando teamId está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTeamDetail(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useMyTeamInvitations', () => {
  it('retorna las invitaciones de equipo del usuario', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMyTeamInvitations(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const invitations = result.current.data?.invitations ?? []
    expect(invitations.length).toBeGreaterThan(0)
    expect(invitations.some((inv) => inv.id === 'tinv-recv-1')).toBe(true)
  })
})

describe('useContestTeamRegistrations', () => {
  it('retorna registros para IDs válidos', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useContestTeamRegistrations('group-1', 'contest-2'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const teams = result.current.data?.teams ?? []
    expect(teams.length).toBeGreaterThan(0)
    expect(teams[0].team.id).toBe(mockTeamRegistrations['contest-2'][0].team.id)
  })

  it('no hace fetch cuando algún ID está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useContestTeamRegistrations('', 'contest-1'), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useCreateTeam', () => {
  beforeEach(() => {
    server.use(
      http.post('http://localhost:8080/api/teams', () =>
        HttpResponse.json({ id: 'team-new', name: baseTeam.name }, { status: 201 }),
      ),
    )
  })

  it('invalida teamKeys.all al crear con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateTeam(), { wrapper })

    // Act
    result.current.mutate(baseTeam)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(result.current.data?.name).toBe('Nuevo Equipo Test')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: teamKeys.all }))
  })
})

describe('useLeaveTeam', () => {
  beforeEach(() => {
    server.use(
      http.delete('http://localhost:8080/api/teams/:teamId/members/me', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )
  })

  it('invalida teamKeys.all al abandonar con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useLeaveTeam(), { wrapper })

    // Act
    result.current.mutate('team-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: teamKeys.all }))
  })
})

describe('useAcceptTeamInvitation', () => {
  it('invalida teamKeys.all y teamKeys.myInvitations al aceptar', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useAcceptTeamInvitation(), { wrapper })

    // Act
    result.current.mutate('tinv-recv-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(result.current.data?.team.id).toBe('team-1')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: teamKeys.all }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: teamKeys.myInvitations }))
  })
})

describe('useRejectTeamInvitation', () => {
  it('invalida teamKeys.myInvitations al rechazar', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRejectTeamInvitation(), { wrapper })

    // Act
    result.current.mutate('tinv-recv-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: teamKeys.myInvitations }))
  })
})

describe('useRegisterTeamToContest', () => {
  beforeEach(() => {
    server.use(
      http.post(
        'http://localhost:8080/api/groups/:groupId/contests/:contestId/team-registrations/:teamId',
        () => HttpResponse.json({ id: 'reg-new' }, { status: 201 }),
      ),
    )
  })

  it('invalida contestRegistrations, contestDetail y la clave literal de registrations', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRegisterTeamToContest(), { wrapper })

    // Act
    result.current.mutate({
      groupId: 'group-1',
      contestId: 'contest-1',
      teamId: 'team-1',
      selectedMembers: ['u1', 'u3'],
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert — cross-resource invalidations
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: teamKeys.contestRegistrations('group-1', 'contest-1') }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: contestKeys.detail('group-1', 'contest-1') }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contests', 'registrations', 'group-1', 'contest-1'] }),
    )
  })
})

describe('useRenameTeam', () => {
  it('retorna el nombre guardado y refresca equipos y competencias', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRenameTeam(), { wrapper })

    // Act
    result.current.mutate({ teamId: 'team-1', data: { name: 'Nuevo Nombre' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(result.current.data?.name).toBe('Nuevo Nombre')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: teamKeys.all }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: contestKeys.all }))
  })

  it('permite cambiar solo las mayúsculas del propio nombre', async () => {
    // Arrange
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRenameTeam(), { wrapper })

    // Act
    result.current.mutate({ teamId: 'team-1', data: { name: 'COMPETITIVE CODERS' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(result.current.data?.name).toBe('COMPETITIVE CODERS')
  })

  it('propaga el 409 cuando el nombre ya lo usa otro equipo', async () => {
    // Arrange
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRenameTeam(), { wrapper })

    // Act: "Algorithm Masters" belongs to team-2
    result.current.mutate({ teamId: 'team-1', data: { name: 'algorithm masters' } })
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Assert
    expect(result.current.error).toBeInstanceOf(ApiClientError)
    expect((result.current.error as ApiClientError).status).toBe(409)
    expect((result.current.error as ApiClientError).code).toBe('TEAM_NAME_EXISTS')
  })
})

describe('useRemoveTeamMember', () => {
  it('invalida teamKeys.all al quitar a un miembro', async () => {
    // Arrange
    server.use(
      http.delete('http://localhost:8080/api/teams/:teamId/members/:userId', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRemoveTeamMember(), { wrapper })

    // Act
    result.current.mutate({ teamId: 'team-1', userId: 'u3' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: teamKeys.all }))
  })

  it('llama al endpoint del miembro indicado', async () => {
    // Arrange
    let removed = ''
    server.use(
      http.delete('http://localhost:8080/api/teams/:teamId/members/:userId', ({ params }) => {
        removed = `${params.teamId}/${params.userId}`
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRemoveTeamMember(), { wrapper })

    // Act
    result.current.mutate({ teamId: 'team-1', userId: 'u3' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(removed).toBe('team-1/u3')
  })

  it('propaga el 400 al intentar quitarse a sí mismo', async () => {
    // Arrange: luisadmin is u1 in team-1
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRemoveTeamMember(), { wrapper })

    // Act
    result.current.mutate({ teamId: 'team-1', userId: 'u1' })
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Assert
    expect((result.current.error as ApiClientError).code).toBe('CANNOT_REMOVE_SELF')
  })
})

describe('useTeamLeaveImpact', () => {
  it('pregunta por el miembro indicado cuando se pasa userId', async () => {
    // Arrange
    let asked: string | null = 'sin llamar'
    server.use(
      http.get('http://localhost:8080/api/teams/:teamId/leave-impact', ({ request }) => {
        asked = new URL(request.url).searchParams.get('userId')
        return HttpResponse.json({ registrationsToCancel: [{ contestId: 'c1', contestName: 'Taller ICPC', groupId: 'g1' }] })
      }),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTeamLeaveImpact('team-1', true, 'u3'), { wrapper })

    // Act
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(asked).toBe('u3')
    expect(result.current.data?.registrationsToCancel[0].contestName).toBe('Taller ICPC')
  })

  it('no manda userId cuando es el propio usuario quien saldría', async () => {
    // Arrange
    let asked: string | null = 'sin llamar'
    server.use(
      http.get('http://localhost:8080/api/teams/:teamId/leave-impact', ({ request }) => {
        asked = new URL(request.url).searchParams.get('userId')
        return HttpResponse.json({ registrationsToCancel: [] })
      }),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTeamLeaveImpact('team-1', true), { wrapper })

    // Act
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(asked).toBeNull()
  })

  it('no pregunta mientras el diálogo está cerrado', () => {
    // Arrange / Act
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTeamLeaveImpact('team-1', false, 'u3'), { wrapper })

    // Assert
    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})
