import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken, getAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockUsers } from '@/mocks/data'
import type { LoginRequest, UpdateProfileRequest } from '@/types/user'
import {
  userKeys,
  useCurrentUser,
  useUserProfile,
  useSearchUsers,
  useLogin,
  useLogout,
  useUpdateProfile,
  useRegister,
  useConfirmDeactivation,
  useAdminUpdateUser,
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

    expect(result.current.data?.nickname).toBe(mockCurrentUser.nickname)
    expect(result.current.data?.role).toBe(mockCurrentUser.role)
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
    expect(result.current.error).toBeDefined()
  })
})

describe('useUserProfile', () => {
  it('retorna el perfil público para un nickname válido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUserProfile(mockCurrentUser.nickname), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.nickname).toBe(mockCurrentUser.nickname)
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
    expect(cached?.nickname).toBe(mockCurrentUser.nickname)
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
      expect.objectContaining({ queryKey: userKeys.profile(mockCurrentUser.nickname) }),
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
