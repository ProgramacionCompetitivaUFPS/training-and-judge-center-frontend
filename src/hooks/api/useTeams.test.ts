import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockMyTeams, mockTeamDetails, mockTeamInvitations, mockTeamRegistrations } from '@/mocks/data'
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

// Builder — input mínimo válido para CreateTeamRequest
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
    expect(result.current.data?.name).toBe(mockTeamDetails['team-1'].name)
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
    expect(invitations[0].id).toBe(mockTeamInvitations[0].id)
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

    // Assert — cross-resource invalidation
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
