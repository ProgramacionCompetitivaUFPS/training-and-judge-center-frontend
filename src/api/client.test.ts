import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { setAccessToken, clearAccessToken, resetSessionExpiredNotified, subscribeSessionExpired } from '@/lib/tokenStore'
import { ApiClientError } from '@/lib/errors'
import { apiClient } from './client'

// Builds a minimal Response-like object for vi.spyOn(global, 'fetch')
function makeFetchResponse(status: number, body: unknown = {}, ok?: boolean): Response {
  const isOk = ok ?? (status >= 200 && status < 300)
  const jsonBody = JSON.stringify(body)
  return {
    ok: isOk,
    status,
    statusText: 'mock',
    json: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob([jsonBody])),
    clone: () => makeFetchResponse(status, body, ok),
    headers: new Headers(),
  } as unknown as Response
}

function mockFetchSequence(...responses: Array<{ status: number; body?: unknown }>) {
  let call = 0
  vi.spyOn(global, 'fetch').mockImplementation(() => {
    const r = responses[Math.min(call++, responses.length - 1)]
    return Promise.resolve(makeFetchResponse(r.status, r.body ?? {}))
  })
}

beforeEach(() => setAccessToken('test-token'))
afterEach(() => {
  clearAccessToken()
  vi.restoreAllMocks()
  resetSessionExpiredNotified()
})

describe('auth headers', () => {
  it('inyecta el header Authorization: Bearer cuando hay token', async () => {
    const spy = mockFetchSequence({ status: 200, body: { ok: true } })
    void spy
    await apiClient.get('/test')
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token')
  })

  it('no incluye Authorization cuando no hay token', async () => {
    clearAccessToken()
    mockFetchSequence({ status: 200, body: {} })
    await apiClient.get('/test')
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined()
  })
})

describe('buildUrl', () => {
  it('agrega los query params definidos a la URL', async () => {
    mockFetchSequence({ status: 200, body: {} })
    await apiClient.get('/items', { params: { page: 2, limit: 10 } })
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string]
    expect(url).toContain('page=2')
    expect(url).toContain('limit=10')
  })

  it('omite los params undefined', async () => {
    mockFetchSequence({ status: 200, body: {} })
    await apiClient.get('/items', { params: { page: 1, filter: undefined } })
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string]
    expect(url).not.toContain('filter')
  })
})

describe('métodos HTTP', () => {
  it('GET devuelve el JSON parseado en 200', async () => {
    mockFetchSequence({ status: 200, body: { id: 'abc' } })
    const result = await apiClient.get<{ id: string }>('/resource')
    expect(result.id).toBe('abc')
  })

  it('POST envía el body como JSON con Content-Type: application/json', async () => {
    mockFetchSequence({ status: 201, body: { id: 'new' } })
    await apiClient.post('/resource', { name: 'Test' })
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ name: 'Test' }))
  })

  it('PUT envía el body como JSON', async () => {
    mockFetchSequence({ status: 200, body: {} })
    await apiClient.put('/resource/1', { name: 'Updated' })
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(JSON.stringify({ name: 'Updated' }))
  })

  it('PATCH envía el body como JSON', async () => {
    mockFetchSequence({ status: 200, body: {} })
    await apiClient.patch('/resource/1', { field: 'val' })
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe(JSON.stringify({ field: 'val' }))
  })

  it('DELETE envía la request sin body por defecto', async () => {
    mockFetchSequence({ status: 204 })
    await apiClient.delete('/resource/1')
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
  })

  it('DELETE envía body JSON cuando config.body está definido', async () => {
    mockFetchSequence({ status: 200, body: {} })
    await apiClient.delete('/resource/1', { body: { reason: 'test' } })
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(init.body).toBe(JSON.stringify({ reason: 'test' }))
  })

  it('postFormData envía FormData sin Content-Type explícito', async () => {
    mockFetchSequence({ status: 201, body: {} })
    const form = new FormData()
    form.append('file', new Blob(['data']), 'file.txt')
    await apiClient.postFormData('/upload', form)
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined()
    expect(init.body).toBeInstanceOf(FormData)
  })

  it('devuelve undefined en respuesta 204', async () => {
    mockFetchSequence({ status: 204 })
    const result = await apiClient.delete('/resource/1')
    expect(result).toBeUndefined()
  })
})

describe('manejo de errores', () => {
  it('lanza ApiClientError con status/code/message en respuesta no-ok', async () => {
    mockFetchSequence({
      status: 404,
      body: { error: 'NOT_FOUND', message: 'recurso no encontrado' },
    })
    await expect(apiClient.get('/missing')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'recurso no encontrado',
    })
  })

  it('el error lanzado es instancia de ApiClientError', async () => {
    mockFetchSequence({ status: 500, body: { error: 'INTERNAL_ERROR', message: 'oops' } })
    await expect(apiClient.get('/broken')).rejects.toBeInstanceOf(ApiClientError)
  })

  it('usa código UNKNOWN y statusText cuando el body no es JSON válido', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: () => Promise.reject(new SyntaxError('bad json')),
      clone: () => ({ json: () => Promise.reject(new SyntaxError('bad json')) }),
    } as unknown as Response)
    await expect(apiClient.get('/broken')).rejects.toMatchObject({
      status: 503,
      code: 'UNKNOWN',
    })
  })

  it('getBlob lanza ApiClientError en respuesta no-ok', async () => {
    mockFetchSequence({ status: 403, body: { error: 'FORBIDDEN', message: 'sin acceso' } })
    await expect(apiClient.getBlob('/file')).rejects.toBeInstanceOf(ApiClientError)
  })

  it('getBlob devuelve un Blob en respuesta ok', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['content'], { type: 'text/plain' })),
      clone: () => ({ json: () => Promise.resolve({}) }),
    } as unknown as Response)
    const result = await apiClient.getBlob('/file')
    expect(result).toBeInstanceOf(Blob)
  })
})

describe('auto-refresh en 401', () => {
  it('reintenta la request original tras un refresh exitoso', async () => {
    let call = 0
    vi.spyOn(global, 'fetch').mockImplementation(() => {
      call++
      if (call === 1)
        return Promise.resolve(
          makeFetchResponse(401, { error: 'UNAUTHORIZED', message: 'unauth' }),
        )
      if (call === 2)
        return Promise.resolve(makeFetchResponse(200, { token: 'new-token' })) // refresh
      return Promise.resolve(makeFetchResponse(200, { id: 'retry-ok' })) // retry original
    })

    const result = await apiClient.get<{ id: string }>('/protected')
    expect(result.id).toBe('retry-ok')
    expect(call).toBe(3)
  })

  it('limpia el token y notifica sesión expirada cuando el refresh falla', async () => {
    let call = 0
    vi.spyOn(global, 'fetch').mockImplementation(() => {
      call++
      if (call === 1)
        return Promise.resolve(
          makeFetchResponse(401, { error: 'UNAUTHORIZED', message: 'unauth' }),
        )
      // refresh endpoint returns 401 → performRefresh catches and returns false
      return Promise.resolve(makeFetchResponse(401, { error: 'UNAUTHORIZED' }))
    })

    const sessionExpiredListener = vi.fn()
    subscribeSessionExpired(sessionExpiredListener)

    await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(ApiClientError)
    expect(sessionExpiredListener).toHaveBeenCalledTimes(1)
  })

  it('no reintenta cuando body.error no es UNAUTHORIZED', async () => {
    mockFetchSequence({ status: 401, body: { error: 'FORBIDDEN', message: 'no' } })
    await expect(apiClient.get('/protected')).rejects.toMatchObject({ status: 401 })
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1)
  })

  it('deduplica llamadas concurrentes al refresh (solo un /auth/refresh)', async () => {
    let call = 0
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      call++
      const urlStr = String(url)
      if (urlStr.includes('/auth/refresh'))
        return Promise.resolve(makeFetchResponse(200, { token: 'refreshed' }))
      if (call <= 2)
        return Promise.resolve(
          makeFetchResponse(401, { error: 'UNAUTHORIZED', message: 'unauth' }),
        )
      return Promise.resolve(makeFetchResponse(200, {}))
    })

    await Promise.all([apiClient.get('/a'), apiClient.get('/b')])

    const refreshCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(([url]) =>
      String(url).includes('/auth/refresh'),
    )
    expect(refreshCalls).toHaveLength(1)
  })
})
