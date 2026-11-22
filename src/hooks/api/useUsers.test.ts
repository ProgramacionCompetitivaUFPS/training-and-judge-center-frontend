import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { ApiClientError } from '@/lib/errors'
import { setAccessToken, clearAccessToken, getAccessToken } from '@/lib/tokenStore'
import * as tokenStore from '@/lib/tokenStore'
import { mockCurrentUser, mockUsers } from '@/mocks/data'
import type { LoginRequest, UpdateProfileRequest } from '@/types/user'
import { stubEndpoint, exerciseMutation, exerciseQuery, describeMutationCases } from '@/test/hookHarness'
import {
  userKeys,
  useCurrentUser,
  useUserProfile,
  useSearchUsers,
  useLogin,
  useGoogleLogin,
  useLogout,
  useUpdateProfile,
  useRegister,
  useConfirmDeactivation,
  useAdminUpdateUser,
  useLinkGoogle,
  useUnlinkGoogle,
  useChangePassword,
  useSetPassword,
  useRequestEmailChange,
  useConfirmEmailChange,
  useRecoverPassword,
  useResetPassword,
  useRequestDeactivation,
  useAdminDeactivateUser,
  useUserDashboard,
  useUserStats,
  useAdminUsers,
  useAdminUserFilterOptions,
  useSoleLeadGroups,
} from './useUsers'

function makeWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

const baseLogin: LoginRequest = { email: mockCurrentUser.email, password: 'password123', rememberSession: false }
const baseUpdateProfile: UpdateProfileRequest = {
  name: mockCurrentUser.name,
  nickname: mockCurrentUser.nickname,
  country: mockCurrentUser.country!,
  city: mockCurrentUser.city!,
  institution: mockCurrentUser.institution!,
}

beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
afterEach(() => clearAccessToken())

describe('useCurrentUser', () => {
  it('retorna el usuario autenticado con token válido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCurrentUser(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.nickname).toBe('luisadmin')
    expect(result.current.data?.role).toBe('ADMIN')
  })

  it('no hace fetch cuando enabled es false', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCurrentUser(false), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })

  it('propaga error 401 cuando el servidor rechaza el token', async () => {
    // Arrange
    server.use(
      http.get('http://localhost:8080/api/users/me', () =>
        HttpResponse.json({ error: 'UNAUTHORIZED', message: 'Token inválido' }, { status: 401 }),
      ),
    )
    const { wrapper } = makeWrapper()

    // Act
    const { result } = renderHook(() => useCurrentUser(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Assert
    expect(result.current.error).toBeInstanceOf(ApiClientError)
    expect((result.current.error as ApiClientError).status).toBe(401)
  })
})

describe('useUserProfile', () => {
  it('retorna el perfil público para un nickname válido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUserProfile(mockCurrentUser.nickname), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.nickname).toBe('luisadmin')
  })

  it('no hace fetch cuando nickname está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUserProfile(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useSearchUsers', () => {
  it('no hace fetch cuando q tiene menos de 2 caracteres', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSearchUsers('a'), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })

  it('retorna usuarios que coincidan con la query', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSearchUsers('luis'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.users.some((u) => u.nickname === mockCurrentUser.nickname)).toBe(true)
  })
})

describe('useLogin', () => {
  it('guarda el token en tokenStore y el usuario en cache al autenticarse', async () => {
    // Arrange
    clearAccessToken()
    const { wrapper, queryClient } = makeWrapper()
    const { result } = renderHook(() => useLogin(), { wrapper })

    // Act
    result.current.mutate(baseLogin)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(getAccessToken()).toBe(result.current.data?.token)
    const cached = queryClient.getQueryData<typeof mockCurrentUser>(userKeys.me)
    expect(cached?.nickname).toBe('luisadmin')
  })

  it('invalida userKeys.me después del login', async () => {
    // Arrange
    clearAccessToken()
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useLogin(), { wrapper })

    // Act
    result.current.mutate(baseLogin)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: userKeys.me }))
  })
})

describe('useLogout', () => {
  it('limpia el cache completo y borra el token al hacer logout', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const clearSpy = vi.spyOn(queryClient, 'clear')
    const { result } = renderHook(() => useLogout(), { wrapper })

    // Act
    result.current.mutate()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(clearSpy).toHaveBeenCalledOnce()
    expect(getAccessToken()).toBeNull()
  })
})

describe('useUpdateProfile', () => {
  it('hace merge sobre userKeys.me conservando campos no devueltos por el PUT', async () => {
    // Arrange — handler omits hasPassword and googleLinked (matches the real PUT response)
    server.use(
      http.put('http://localhost:8080/api/users', () =>
        HttpResponse.json({
          ...mockCurrentUser,
          name: 'Luis Admin Actualizado',
          hasPassword: undefined,
          googleLinked: undefined,
        }),
      ),
    )
    const { wrapper, queryClient } = makeWrapper()
    queryClient.setQueryData(userKeys.me, { ...mockCurrentUser, hasPassword: true, googleLinked: false })
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateProfile(), { wrapper })

    // Act
    result.current.mutate({ ...baseUpdateProfile, name: 'Luis Admin Actualizado' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    const cached = queryClient.getQueryData<typeof mockCurrentUser>(userKeys.me)
    expect(cached?.name).toBe('Luis Admin Actualizado')
    expect(cached?.hasPassword).toBe(true)
    expect(cached?.googleLinked).toBe(false)
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: userKeys.profile('luisadmin') }),
    )
  })
})

describe('useRegister', () => {
  it('crea un usuario nuevo sin invalidaciones adicionales', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRegister(), { wrapper })

    // Act
    result.current.mutate({
      email: 'nuevo@test.com',
      password: 'Password1!',
      name: 'Nuevo Usuario',
      nickname: 'nuevousuario',
      country: 'Colombia',
      city: 'Bogotá',
      institution: 'Universidad Test',
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('useConfirmDeactivation', () => {
  it('borra el token de tokenStore en onSuccess', async () => {
    // Arrange
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useConfirmDeactivation(), { wrapper })

    // Act
    result.current.mutate({ code: 'deact-code-123' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(getAccessToken()).toBeNull()
  })
})

describe('useAdminUpdateUser', () => {
  beforeEach(() => {
    server.use(
      http.put('http://localhost:8080/api/admin/users/:id', () =>
        HttpResponse.json({ ...mockUsers[1], role: 'ADMIN' }),
      ),
    )
  })

  it('invalida userKeys.all al actualizar con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useAdminUpdateUser(), { wrapper })

    // Act
    result.current.mutate({ id: mockUsers[1].id!, data: { role: 'ADMIN' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(result.current.data?.role).toBe('ADMIN')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: userKeys.all }))
  })
})

describe('session mark — login y logout', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('useLogin llama markSessionActive al tener éxito', async () => {
    // Arrange
    clearAccessToken()
    const spy = vi.spyOn(tokenStore, 'markSessionActive')
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLogin(), { wrapper })

    // Act
    result.current.mutate(baseLogin)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('useGoogleLogin llama markSessionActive al tener éxito', async () => {
    // Arrange
    clearAccessToken()
    const spy = vi.spyOn(tokenStore, 'markSessionActive')
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useGoogleLogin(), { wrapper })

    // Act
    result.current.mutate({ id_token: 'mock-google-token', rememberSession: false })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('useLogout llama clearSessionMark al finalizar', async () => {
    // Arrange
    const spy = vi.spyOn(tokenStore, 'clearSessionMark')
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLogout(), { wrapper })

    // Act
    result.current.mutate()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('useConfirmDeactivation llama clearSessionMark al tener éxito', async () => {
    // Arrange
    const spy = vi.spyOn(tokenStore, 'clearSessionMark')
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useConfirmDeactivation(), { wrapper })

    // Act
    result.current.mutate({ code: 'deact-code-123' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describeMutationCases('mutaciones de cuenta (Google, contraseña, correo, desactivación)', [
  {
    name: 'useLinkGoogle',
    run: () => exerciseMutation(useLinkGoogle, { id_token: 'google-token' }),
    method: 'post',
    path: '/users/google',
    requestBody: { id_token: 'google-token' },
    respond: {},
    invalidates: [userKeys.me],
  },
  {
    name: 'useUnlinkGoogle',
    run: () => exerciseMutation(useUnlinkGoogle, undefined),
    method: 'delete',
    path: '/users/google',
    requestBody: undefined,
    respond: {},
    invalidates: [userKeys.me],
  },
  {
    name: 'useChangePassword',
    run: () => exerciseMutation(useChangePassword, { currentPassword: 'Old12345!', newPassword: 'New12345!' }),
    method: 'put',
    path: '/users/password',
    requestBody: { currentPassword: 'Old12345!', newPassword: 'New12345!' },
    respond: {},
    invalidates: [],
  },
  {
    name: 'useSetPassword',
    run: () => exerciseMutation(useSetPassword, { newPassword: 'New12345!' }),
    method: 'post',
    path: '/users/password',
    requestBody: { newPassword: 'New12345!' },
    respond: {},
    invalidates: [userKeys.me],
  },
  {
    name: 'useRequestEmailChange',
    run: () => exerciseMutation(useRequestEmailChange, { newEmail: 'nuevo@correo.com', password: 'Pass1234!' }),
    method: 'post',
    path: '/users/email-change/request',
    requestBody: { newEmail: 'nuevo@correo.com', password: 'Pass1234!' },
    respond: {},
    invalidates: [],
  },
  {
    name: 'useConfirmEmailChange',
    run: () => exerciseMutation(useConfirmEmailChange, { code: '123456' }),
    method: 'post',
    path: '/users/email-change/confirm',
    requestBody: { code: '123456' },
    respond: {},
    invalidates: [userKeys.me],
  },
  {
    name: 'useRecoverPassword',
    run: () => exerciseMutation(useRecoverPassword, { email: 'ana@correo.com' }),
    method: 'post',
    path: '/password/forgot',
    requestBody: { email: 'ana@correo.com' },
    respond: {},
    invalidates: [],
  },
  {
    name: 'useResetPassword',
    run: () => exerciseMutation(useResetPassword, { email: 'ana@correo.com', code: '654321', newPassword: 'New12345!' }),
    method: 'post',
    path: '/password/reset',
    requestBody: { email: 'ana@correo.com', code: '654321', newPassword: 'New12345!' },
    respond: {},
    invalidates: [],
  },
  {
    name: 'useRequestDeactivation',
    run: () => exerciseMutation(useRequestDeactivation, { password: 'Pass1234!' }),
    method: 'post',
    path: '/users/deactivation',
    requestBody: { password: 'Pass1234!' },
    respond: {},
    invalidates: [],
  },
  {
    name: 'useAdminDeactivateUser',
    run: () => exerciseMutation(useAdminDeactivateUser, 'user-9'),
    method: 'post',
    path: '/admin/users/user-9/deactivate',
    requestBody: undefined,
    respond: {},
    invalidates: [userKeys.all],
  },
])

describe('consultas de usuario', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it('useUserDashboard retorna el tablero del usuario autenticado', async () => {
    stubEndpoint('get', '/users/me/dashboard', { body: { recentSubmissions: [], upcomingContests: [] } })

    const { data } = await exerciseQuery(() => useUserDashboard())

    expect(data).toEqual({ recentSubmissions: [], upcomingContests: [] })
  })

  it('useUserDashboard no hace fetch cuando enabled es false', async () => {
    const calls = stubEndpoint('get', '/users/me/dashboard', { body: {} })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => useUserDashboard(false), { wrapper })
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(result.current.fetchStatus).toBe('idle')
    expect(calls).toHaveLength(0)
  })

  it('useUserStats retorna las estadísticas del perfil', async () => {
    stubEndpoint('get', '/users/me/stats', { body: { solved: 12, attempted: 30 } })

    const { data } = await exerciseQuery(() => useUserStats())

    expect(data).toEqual({ solved: 12, attempted: 30 })
  })

  it('useAdminUsers traduce search/sortBy/sortOrder a searchTerm/sort/order en la URL', async () => {
    const calls = stubEndpoint('get', '/admin/users', { body: { users: [], pagination: { total: 0 } } })

    await exerciseQuery(() =>
      useAdminUsers({ page: 2, search: 'ana', sortBy: 'nickname', sortOrder: 'desc', role: 'COACH' }),
    )

    const query = new URLSearchParams(calls[0].search)
    expect(query.get('searchTerm')).toBe('ana')
    expect(query.get('sort')).toBe('nickname')
    expect(query.get('order')).toBe('desc')
    expect(query.get('page')).toBe('2')
    expect(query.get('role')).toBe('COACH')
    expect(query.has('search')).toBe(false)
  })

  it('useAdminUsers propaga ApiClientError 403 cuando el usuario no es admin', async () => {
    stubEndpoint('get', '/admin/users', { status: 403, body: { error: 'FORBIDDEN', message: 'no' } })

    const { error } = await exerciseQuery(() => useAdminUsers())

    expect(error).toBeInstanceOf(ApiClientError)
    expect((error as ApiClientError).status).toBe(403)
  })

  it('useAdminUserFilterOptions retorna las opciones de filtro', async () => {
    stubEndpoint('get', '/admin/users/filters', { body: { countries: ['Colombia'], cities: [], institutions: [] } })

    const { data } = await exerciseQuery(() => useAdminUserFilterOptions())

    expect(data).toEqual({ countries: ['Colombia'], cities: [], institutions: [] })
  })
})

describe('useSoleLeadGroups', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it('consulta /users/me/sole-lead-groups cuando no hay userId', async () => {
    const calls = stubEndpoint('get', '/users/me/sole-lead-groups', { body: { groups: [{ id: 'group-1' }] } })

    const { data } = await exerciseQuery(() => useSoleLeadGroups(undefined, true))

    expect(calls).toHaveLength(1)
    expect(data).toEqual({ groups: [{ id: 'group-1' }] })
  })

  it('consulta /admin/users/:userId/sole-lead-groups cuando se indica un usuario', async () => {
    const calls = stubEndpoint('get', '/admin/users/user-9/sole-lead-groups', { body: { groups: [] } })

    const { data } = await exerciseQuery(() => useSoleLeadGroups('user-9', true))

    expect(calls).toHaveLength(1)
    expect(data).toEqual({ groups: [] })
  })

  it('no hace fetch cuando enabled es false', async () => {
    const calls = stubEndpoint('get', '/users/me/sole-lead-groups', { body: {} })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => useSoleLeadGroups(undefined, false), { wrapper })
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(result.current.fetchStatus).toBe('idle')
    expect(calls).toHaveLength(0)
  })
})
