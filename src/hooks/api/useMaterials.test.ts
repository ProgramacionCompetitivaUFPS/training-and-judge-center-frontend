import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockMaterials } from '@/mocks/data'
import type { CreateMaterialRequest } from '@/types/material'
import {
  materialKeys,
  useMaterials,
  useMaterialTags,
  useMaterialAuthors,
  useMaterialDetail,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  usePublishMaterial,
} from './useMaterials'

function makeWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

// Builder — input mínimo válido para CreateMaterialRequest
const baseMaterial: CreateMaterialRequest = {
  title: 'Material de prueba',
  content: '# Test\n\nContenido de prueba.',
  tags: ['test'],
}

const GROUP_ID = mockMaterials[0].groupId
const MATERIAL_ID = mockMaterials[0].id

beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
afterEach(() => clearAccessToken())

describe('useMaterials', () => {
  it('retorna lista paginada con al menos un material del grupo', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMaterials(GROUP_ID), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.total).toBeGreaterThan(0)
    expect(result.current.data?.materials.some((m) => m.id === MATERIAL_ID)).toBe(true)
  })

  it('no hace fetch cuando groupId está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMaterials(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })

  it('propaga error cuando el servidor responde 500', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/materials', () =>
        HttpResponse.json({ error: 'SERVER_ERROR', message: 'Error interno' }, { status: 500 }),
      ),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMaterials(GROUP_ID), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useMaterialTags', () => {
  it('retorna los tags del grupo', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMaterialTags(GROUP_ID), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(Array.isArray(result.current.data?.tags)).toBe(true)
    expect(result.current.data!.tags.length).toBeGreaterThan(0)
  })

  it('no hace fetch cuando groupId está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMaterialTags(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useMaterialAuthors', () => {
  it('retorna los autores del grupo', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMaterialAuthors(GROUP_ID), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(Array.isArray(result.current.data?.authors)).toBe(true)
  })
})

describe('useMaterialDetail', () => {
  it('retorna el detalle del material para IDs válidos', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMaterialDetail(GROUP_ID, MATERIAL_ID), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe(MATERIAL_ID)
    expect(result.current.data?.title).toBe(mockMaterials[0].title)
  })

  it('no hace fetch cuando algún ID está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMaterialDetail('', MATERIAL_ID), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useCreateMaterial', () => {
  beforeEach(() => {
    server.use(
      http.post('http://localhost:8080/api/groups/:groupId/materials', () =>
        HttpResponse.json({ id: 'mat-new', ...baseMaterial }, { status: 201 }),
      ),
    )
  })

  it('invalida list, tags y authors al crear con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateMaterial(), { wrapper })

    // Act
    result.current.mutate({ groupId: GROUP_ID, data: baseMaterial })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: materialKeys.list(GROUP_ID) }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: materialKeys.tags(GROUP_ID) }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: materialKeys.authors(GROUP_ID) }))
  })
})

describe('useUpdateMaterial', () => {
  beforeEach(() => {
    server.use(
      http.patch('http://localhost:8080/api/groups/:groupId/materials/:materialId', () =>
        HttpResponse.json({ id: MATERIAL_ID, title: 'Actualizado' }),
      ),
    )
  })

  it('invalida detail, list, tags y authors al actualizar con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateMaterial(), { wrapper })

    // Act
    result.current.mutate({ groupId: GROUP_ID, materialId: MATERIAL_ID, data: { title: 'Actualizado' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: materialKeys.detail(GROUP_ID, MATERIAL_ID) }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: materialKeys.list(GROUP_ID) }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: materialKeys.tags(GROUP_ID) }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: materialKeys.authors(GROUP_ID) }))
  })
})

describe('useDeleteMaterial', () => {
  beforeEach(() => {
    server.use(
      http.delete('http://localhost:8080/api/groups/:groupId/materials/:materialId', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )
  })

  it('invalida list, tags y authors al eliminar con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteMaterial(), { wrapper })

    // Act
    result.current.mutate({ groupId: GROUP_ID, materialId: MATERIAL_ID })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: materialKeys.list(GROUP_ID) }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: materialKeys.tags(GROUP_ID) }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: materialKeys.authors(GROUP_ID) }))
  })
})

describe('usePublishMaterial', () => {
  beforeEach(() => {
    server.use(
      http.post('http://localhost:8080/api/groups/:groupId/materials/:materialId/publish', () =>
        HttpResponse.json({ id: MATERIAL_ID, status: 'PUBLISHED' }),
      ),
    )
  })

  it('invalida detail y list al publicar con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => usePublishMaterial(), { wrapper })

    // Act
    result.current.mutate({ groupId: GROUP_ID, materialId: MATERIAL_ID })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: materialKeys.detail(GROUP_ID, MATERIAL_ID) }))
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: materialKeys.list(GROUP_ID) }))
  })
})
