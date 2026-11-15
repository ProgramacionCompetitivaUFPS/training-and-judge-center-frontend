import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { resetProblemHandlerState } from '@/mocks/handlers/problems'
import { mockProblems } from '@/mocks/data'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import type { CreateProblemRequest } from '@/types/problem'
import {
  problemKeys,
  useProblems,
  useProblemDetail,
  useCreateProblem,
  useProblemSearch,
  useProblemStatistics,
  useProblemTags,
  useUpdateProblem,
  useDeleteProblem,
  useLatestValidation,
  useGetModifiers,
  useUpdateAccessibility,
  useAddModifier,
  useRemoveModifier,
} from './useProblems'

function makeWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

const baseProblem: CreateProblemRequest = {
  slug: 'test-problem',
  title: 'Test Problem',
}

beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
afterEach(() => {
  clearAccessToken()
  resetProblemHandlerState()
})

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

    expect(result.current.data?.slug).toBe('two-sum')
    expect(result.current.data?.title).toBe('Two Sum')
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
    expect(result.current.data?.slug).toBe('test-problem')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: problemKeys.all }))
  })
})

describe('useProblems paginación', () => {
  it('mantiene visible la página anterior mientras carga la siguiente', async () => {
    // Arrange
    const { wrapper } = makeWrapper()
    const { result, rerender } = renderHook(
      ({ page }) => useProblems({ page, limit: 1 }),
      { wrapper, initialProps: { page: 1 } },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const firstPageSlug = result.current.data?.problems[0].slug

    // Act
    rerender({ page: 2 })

    // Assert: the list is not replaced by a loading state in between
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true))
    expect(result.current.data?.pagination.page).toBe(1)
    expect(result.current.data?.problems[0].slug).toBe(firstPageSlug)

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false))
    expect(result.current.data?.pagination.page).toBe(2)
    expect(result.current.data?.problems[0].slug).not.toBe(firstPageSlug)
  })
})

describe('useProblemSearch', () => {
  it('no hace fetch cuando search tiene menos de 2 caracteres', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProblemSearch('a'), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })

  it('retorna problemas que coincidan con la búsqueda', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProblemSearch('two'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.problems.some((p) => p.slug === 'two-sum')).toBe(true)
  })
})

describe('useProblemStatistics', () => {
  it('retorna estadísticas con totalSubmissions conocido para two-sum', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProblemStatistics('two-sum'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.totalSubmissions).toBe(1250)
  })

  it('no hace fetch cuando el slug está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProblemStatistics(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useProblemTags', () => {
  it('retorna el vocabulario de tags con tags conocidos', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProblemTags(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.tags[0]).toBe('2-sat')
    expect(result.current.data?.tags).toContain('arrays')
  })
})

describe('useUpdateProblem', () => {
  beforeEach(() => {
    server.use(
      http.put('http://localhost:8080/api/problems/p/:slug', () =>
        HttpResponse.json({ slug: 'two-sum', title: 'Two Sum Updated' }),
      ),
    )
  })

  it('invalida problemKeys.all, detail y validation; y retorna el slug actualizado', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateProblem(), { wrapper })

    result.current.mutate({ slug: 'two-sum', data: { title: 'Two Sum Updated' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.slug).toBe('two-sum')
    expect(result.current.data?.title).toBe('Two Sum Updated')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: problemKeys.all }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: problemKeys.detail('two-sum') }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: problemKeys.validation('two-sum') }))
  })
})

describe('useDeleteProblem', () => {
  beforeEach(() => {
    server.use(
      http.delete('http://localhost:8080/api/problems/p/:slug', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )
  })

  it('invalida problemKeys.all al eliminar', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteProblem(), { wrapper })

    result.current.mutate({ slug: 'two-sum', data: { confirmSlug: 'two-sum' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: problemKeys.all }))
  })
})

describe('useLatestValidation', () => {
  it('retorna found:false cuando el problema no tiene validación previa', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLatestValidation('two-sum'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.found).toBe(false)
  })

  it('no hace fetch cuando enabled es false', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLatestValidation('two-sum', { enabled: false }), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useGetModifiers', () => {
  it('retorna los modificadores de two-sum con el primer nickname conocido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useGetModifiers('two-sum'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].nickname).toBe('mariacoach')
    expect(result.current.data!.some((m) => m.nickname === 'luisadmin')).toBe(true)
  })

  it('no hace fetch cuando el slug está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useGetModifiers(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useUpdateAccessibility', () => {
  beforeEach(() => {
    server.use(
      http.patch('http://localhost:8080/api/problems/p/:slug/accessibility', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )
  })

  it('invalida detail, validation y all al actualizar accesibilidad', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateAccessibility(), { wrapper })

    result.current.mutate({ slug: 'two-sum', accessibility: 'PUBLIC' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: problemKeys.detail('two-sum') }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: problemKeys.validation('two-sum') }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: problemKeys.all }))
  })
})

describe('useAddModifier', () => {
  beforeEach(() => {
    server.use(
      http.post('http://localhost:8080/api/problems/p/:slug/modifiers', () =>
        HttpResponse.json({ message: 'Colaborador agregado', modifiers: [{ nickname: 'carloscp', name: 'Carlos' }] }),
      ),
    )
  })

  it('invalida detail y validation al agregar modificador', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useAddModifier(), { wrapper })

    result.current.mutate({ slug: 'two-sum', userNickname: 'carloscp' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: problemKeys.detail('two-sum') }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: problemKeys.validation('two-sum') }))
  })
})

describe('useRemoveModifier', () => {
  beforeEach(() => {
    server.use(
      http.delete('http://localhost:8080/api/problems/p/:slug/modifiers/:nickname', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )
  })

  it('invalida detail y validation al quitar modificador', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRemoveModifier(), { wrapper })

    result.current.mutate({ slug: 'two-sum', nickname: 'carloscp' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: problemKeys.detail('two-sum') }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: problemKeys.validation('two-sum') }))
  })
})
