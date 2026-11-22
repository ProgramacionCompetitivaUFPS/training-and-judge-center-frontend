import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { resetProblemHandlerState } from '@/mocks/handlers/problems'
import { mockProblems } from '@/mocks/data'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import type { CreateProblemRequest } from '@/types/problem'
import { stubEndpoint, stubXhr, exerciseMutation, exerciseQuery, describeMutationCases } from '@/test/hookHarness'
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
  useUploadProblemFile,
  useIsUploadingProblemFile,
  useUploadProgress,
  usePublishProblem,
  useValidateProblem,
  useUnpublishProblem,
  useDeleteProblemFile,
  useAdminRejudgeProblem,
  useProblemTestCases,
  useProblemSourceFile,
  useProblemTestCasePart,
  useDownloadTestCases,
  useExportProblem,
  useImportProblem,
} from './useProblems'
import * as problemsApi from '@/api/problems'
import { ApiClientError } from '@/lib/errors'

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

vi.mock('@/api/problems', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/problems')>()
  return { ...actual, uploadProblemFile: vi.fn() }
})

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

  it('no hace fetch cuando enabled es false', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useProblemStatistics('two-sum', false), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
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

describe('useUploadProblemFile', () => {
  const file = new File(['x'], 'tests.zip', { type: 'application/zip' })
  const uploadMock = vi.mocked(problemsApi.uploadProblemFile)

  beforeEach(() => {
    mockToast.mockClear()
    uploadMock.mockReset()
  })

  it('muestra toast de éxito al subir el archivo', async () => {
    uploadMock.mockResolvedValue(undefined as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUploadProblemFile(), { wrapper })

    result.current.mutate({ slug: 'two-sum', fileType: 'testCases', file })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockToast).toHaveBeenCalledWith({ variant: 'success', title: 'Archivo subido' })
  })

  it('muestra toast de problema publicado si el backend rechaza el upload', async () => {
    uploadMock.mockRejectedValue(new ApiClientError(409, 'PROBLEM_IS_PUBLISHED', 'published'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUploadProblemFile(), { wrapper })

    result.current.mutate({ slug: 'two-sum', fileType: 'testCases', file })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockToast).toHaveBeenCalledWith({
      variant: 'error',
      title: 'No se puede subir el archivo',
      description: 'Este problema está publicado. Despublícalo primero para modificar sus archivos.',
    })
  })

  it('muestra toast de error genérico si el upload falla por otra causa', async () => {
    uploadMock.mockRejectedValue(new Error('network down'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUploadProblemFile(), { wrapper })

    result.current.mutate({ slug: 'two-sum', fileType: 'testCases', file })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockToast).toHaveBeenCalledWith({ variant: 'error', title: 'Error al subir el archivo' })
  })
})

describe('useIsUploadingProblemFile', () => {
  const file = new File(['x'], 'tests.zip', { type: 'application/zip' })
  const uploadMock = vi.mocked(problemsApi.uploadProblemFile)

  beforeEach(() => {
    mockToast.mockClear()
    uploadMock.mockReset()
  })

  it('stays true while the upload runs, even after the component that started it unmounts', async () => {
    let failUpload = () => {}
    uploadMock.mockReturnValue(new Promise<never>((_, reject) => { failUpload = () => reject(new Error('fail')) }))
    const { wrapper } = makeWrapper()
    const uploader = renderHook(() => useUploadProblemFile(), { wrapper })
    const observer = renderHook(() => useIsUploadingProblemFile('two-sum'), { wrapper })
    const otherProblem = renderHook(() => useIsUploadingProblemFile('otro-problema'), { wrapper })
    expect(observer.result.current).toBe(false)

    act(() => uploader.result.current.mutate({ slug: 'two-sum', fileType: 'testCases', file }))
    await waitFor(() => expect(observer.result.current).toBe(true))
    expect(otherProblem.result.current).toBe(false)

    uploader.unmount()
    expect(observer.result.current).toBe(true)

    act(() => failUpload())
    await waitFor(() => expect(observer.result.current).toBe(false))
  })
})

describe('useUploadProgress', () => {
  const file = new File(['x'], 'tests.zip', { type: 'application/zip' })
  const uploadMock = vi.mocked(problemsApi.uploadProblemFile)

  beforeEach(() => {
    mockToast.mockClear()
    uploadMock.mockReset()
  })

  it('starts at 0, follows the progress, survives the uploader unmounting and resets when the upload ends', async () => {
    let report: (pct: number) => void = () => {}
    let failUpload = () => {}
    uploadMock.mockImplementation((_slug, _fileType, _file, onProgress) => {
      report = (pct) => onProgress?.(pct)
      return new Promise<never>((_, reject) => { failUpload = () => reject(new Error('fail')) })
    })
    const { wrapper } = makeWrapper()
    const uploader = renderHook(() => useUploadProblemFile(), { wrapper })
    const observer = renderHook(() => useUploadProgress('two-sum'), { wrapper })
    const otherProblem = renderHook(() => useUploadProgress('otro-problema'), { wrapper })
    expect(observer.result.current).toBeNull()

    act(() => uploader.result.current.mutate({ slug: 'two-sum', fileType: 'testCases', file }))
    await waitFor(() => expect(observer.result.current).toBe(0))
    await waitFor(() => expect(uploadMock).toHaveBeenCalled())

    act(() => report(40))
    await waitFor(() => expect(observer.result.current).toBe(40))
    expect(otherProblem.result.current).toBeNull()

    uploader.unmount()
    act(() => report(70))
    await waitFor(() => expect(observer.result.current).toBe(70))

    act(() => failUpload())
    await waitFor(() => expect(observer.result.current).toBeNull())
  })

  it('also forwards the progress to the onProgress the caller passes', async () => {
    const onProgress = vi.fn()
    uploadMock.mockImplementation(async (_slug, _fileType, _file, report) => {
      report?.(55)
      throw new Error('fail')
    })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUploadProblemFile(), { wrapper })

    result.current.mutate({ slug: 'two-sum', fileType: 'testCases', file, onProgress })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(onProgress).toHaveBeenCalledWith(55)
  })
})

describe('useUploadProgress — retención en cache', () => {
  it('conserva la consulta de progreso más tiempo que dos intentos de subida (5 min cada uno)', () => {
    const { wrapper, queryClient } = makeWrapper()
    renderHook(() => useUploadProgress('two-sum'), { wrapper })

    const query = queryClient.getQueryCache().find({ queryKey: ['upload-progress', 'two-sum'] })

    expect(query?.gcTime).toBeGreaterThan(10 * 60 * 1000)
  })
})

describeMutationCases('mutaciones de publicación y archivos de problemas', [
  {
    name: 'usePublishProblem',
    run: () => exerciseMutation(usePublishProblem, 'two-sum'),
    method: 'post',
    path: '/problems/p/two-sum/publish',
    requestBody: undefined,
    respond: { body: { slug: 'two-sum', status: 'PUBLISHED' } },
    invalidates: [problemKeys.detail('two-sum'), problemKeys.all, problemKeys.validation('two-sum')],
    // a failed publish still has a validation result to show
    invalidatesOnError: [problemKeys.validation('two-sum')],
  },
  {
    name: 'useValidateProblem',
    run: () => exerciseMutation(useValidateProblem, 'two-sum'),
    method: 'post',
    path: '/problems/p/two-sum/validate',
    requestBody: undefined,
    respond: { status: 202, body: { slug: 'two-sum', validationId: 'val-1' } },
    invalidates: [problemKeys.validation('two-sum')],
    invalidatesOnError: [problemKeys.validation('two-sum')],
  },
  {
    name: 'useUnpublishProblem',
    run: () => exerciseMutation(useUnpublishProblem, 'two-sum'),
    method: 'post',
    path: '/problems/p/two-sum/unpublish',
    requestBody: undefined,
    respond: { body: { slug: 'two-sum', status: 'DRAFT' } },
    invalidates: [problemKeys.detail('two-sum'), problemKeys.all],
  },
  {
    name: 'useDeleteProblemFile',
    run: () => exerciseMutation(useDeleteProblemFile, { slug: 'two-sum', fileType: 'solution', fileName: 'a.cpp' }),
    method: 'delete',
    path: '/problems/p/two-sum/files/solution',
    requestBody: undefined,
    respond: {},
    invalidates: [
      problemKeys.detail('two-sum'),
      problemKeys.validation('two-sum'),
      problemKeys.testCases('two-sum'),
      problemKeys.sourceFiles('two-sum'),
    ],
  },
  {
    name: 'useAdminRejudgeProblem',
    run: () => exerciseMutation(useAdminRejudgeProblem, { slug: 'two-sum' }),
    method: 'post',
    path: '/admin/problems/two-sum/rejudge',
    requestBody: undefined,
    respond: {},
    invalidates: [],
  },
])

describe('useDeleteProblemFile (parámetros)', () => {
  it('envía fileName como query param cuando se indica', async () => {
    const calls = stubEndpoint('delete', '/problems/p/two-sum/files/solution')

    await exerciseMutation(useDeleteProblemFile, { slug: 'two-sum', fileType: 'solution', fileName: 'a.cpp' })

    expect(calls[0].search).toBe('?fileName=a.cpp')
  })

  it('no envía query params cuando no hay fileName', async () => {
    const calls = stubEndpoint('delete', '/problems/p/two-sum/files/checker')

    await exerciseMutation(useDeleteProblemFile, { slug: 'two-sum', fileType: 'checker' })

    expect(calls[0].search).toBe('')
  })
})

describe('useAdminRejudgeProblem (parámetros)', () => {
  it('envía contestId como query param cuando se indica', async () => {
    const calls = stubEndpoint('post', '/admin/problems/two-sum/rejudge')

    await exerciseMutation(useAdminRejudgeProblem, { slug: 'two-sum', contestId: 'contest-7' })

    expect(calls[0].search).toBe('?contestId=contest-7')
  })
})

describe('lectura de archivos del problema', () => {
  it('useProblemTestCases retorna el resumen de casos de prueba', async () => {
    stubEndpoint('get', '/problems/p/two-sum/testcases', {
      body: { hasTestCases: true, sampleCount: 2, secretCount: 5, cases: [] },
    })

    const { data } = await exerciseQuery(() => useProblemTestCases('two-sum', true))

    expect(data).toEqual({ hasTestCases: true, sampleCount: 2, secretCount: 5, cases: [] })
  })

  it('useProblemTestCases no hace fetch mientras la lista no está abierta (enabled=false)', async () => {
    const calls = stubEndpoint('get', '/problems/p/two-sum/testcases', { body: {} })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => useProblemTestCases('two-sum', false), { wrapper })
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(result.current.fetchStatus).toBe('idle')
    expect(calls).toHaveLength(0)
  })

  it('useProblemSourceFile pide el archivo con fileName y full=true cuando se pide completo', async () => {
    const calls = stubEndpoint('get', '/problems/p/two-sum/files/solution', {
      body: { fileType: 'solution', filename: 'a.cpp', language: 'cpp20', content: 'int main(){}', truncated: false, sizeBytes: 12 },
    })

    const { data } = await exerciseQuery(() => useProblemSourceFile('two-sum', 'solution', 'a.cpp', true, true))

    expect(calls[0].search).toBe('?fileName=a.cpp&full=true')
    expect(data?.content).toBe('int main(){}')
  })

  it('useProblemSourceFile no envía params cuando no hay fileName ni full', async () => {
    const calls = stubEndpoint('get', '/problems/p/two-sum/files/checker', {
      body: { fileType: 'checker', filename: 'chk.cpp', language: 'cpp20', content: '', truncated: false, sizeBytes: 0 },
    })

    await exerciseQuery(() => useProblemSourceFile('two-sum', 'checker', undefined, true))

    expect(calls[0].search).toBe('')
  })

  it('useProblemTestCasePart devuelve el texto de la entrada de un caso y codifica el nombre en la URL', async () => {
    const requestedNames: string[] = []
    server.use(
      http.get('http://localhost:8080/api/problems/p/two-sum/testcases/sample/:name/input', ({ params }) => {
        requestedNames.push(String(params.name))
        return new HttpResponse('3 4\n', { headers: { 'Content-Type': 'text/plain' } })
      }),
    )

    const { data } = await exerciseQuery(() => useProblemTestCasePart('two-sum', 'sample', 'case 1', 'input', true))

    expect(data).toBe('3 4\n')
    expect(requestedNames).toEqual(['case 1'])
  })
})

describe('descargas de problemas', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function captureDownload() {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:zip'), revokeObjectURL: vi.fn() })
    const names: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download)
    })
    return names
  }

  it('useDownloadTestCases descarga el ZIP de casos como <slug>-testcases.zip', async () => {
    stubEndpoint('get', '/problems/p/two-sum/files/testcases', { body: { zip: true } })
    const names = captureDownload()

    const outcome = await exerciseMutation(useDownloadTestCases, 'two-sum')

    expect(outcome.isSuccess).toBe(true)
    expect(names).toEqual(['two-sum-testcases.zip'])
  })

  it('useExportProblem descarga el paquete como <slug>.zip', async () => {
    stubEndpoint('get', '/problems/p/two-sum/export', { body: { zip: true } })
    const names = captureDownload()

    const outcome = await exerciseMutation(useExportProblem, 'two-sum')

    expect(outcome.isSuccess).toBe(true)
    expect(names).toEqual(['two-sum.zip'])
  })

  it('useExportProblem falla con ApiClientError 403 y no descarga nada', async () => {
    stubEndpoint('get', '/problems/p/two-sum/export', { status: 403, body: { error: 'FORBIDDEN', message: 'no' } })
    const names = captureDownload()

    const outcome = await exerciseMutation(useExportProblem, 'two-sum')

    expect(outcome.isSuccess).toBe(false)
    expect((outcome.error as ApiClientError).status).toBe(403)
    expect(names).toEqual([])
  })
})

describe('useImportProblem', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sube el paquete a /problems/import e invalida problemKeys.all', async () => {
    const sent = stubXhr({ status: 201, body: { slug: 'imported', title: 'Imported' } })

    const outcome = await exerciseMutation(useImportProblem, { file: new File(['zip'], 'p.zip'), slug: 'imported' })

    expect(outcome.isSuccess).toBe(true)
    expect(outcome.data).toEqual({ slug: 'imported', title: 'Imported' })
    expect(sent).toHaveLength(1)
    expect(sent[0].url).toBe('http://localhost:8080/api/problems/import')
    expect((sent[0].body as FormData).get('slug')).toBe('imported')
    expect(outcome.invalidatedKeys).toEqual([problemKeys.all])
  })

  it('propaga ApiClientError 409 y no invalida la caché cuando el slug ya existe', async () => {
    stubXhr({ status: 409, body: { error: 'SLUG_TAKEN', message: 'ya existe' } })

    const outcome = await exerciseMutation(useImportProblem, { file: new File(['zip'], 'p.zip'), slug: 'taken' })

    expect((outcome.error as ApiClientError).code).toBe('SLUG_TAKEN')
    expect(outcome.invalidatedKeys).toEqual([])
  })
})
