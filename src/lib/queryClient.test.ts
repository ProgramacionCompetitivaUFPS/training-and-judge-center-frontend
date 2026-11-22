import { describe, it, expect } from 'vitest'

import { ApiClientError } from '@/lib/errors'
import { createQueryClient } from './queryClient'

type RetryFn = (failureCount: number, error: unknown) => boolean

function getRetry(): RetryFn {
  const retry = createQueryClient().getDefaultOptions().queries?.retry
  return retry as RetryFn
}

describe('createQueryClient', () => {
  it('no reintenta cuando el error es 4xx', () => {
    const retry = getRetry()

    expect(retry(0, new ApiClientError(404, 'NOT_FOUND', 'no existe'))).toBe(false)
    expect(retry(0, new ApiClientError(422, 'INVALID', 'inválido'))).toBe(false)
  })

  it('reintenta una vez cuando el error es 5xx', () => {
    const retry = getRetry()

    expect(retry(0, new ApiClientError(503, 'UNAVAILABLE', 'caído'))).toBe(true)
    expect(retry(1, new ApiClientError(503, 'UNAVAILABLE', 'caído'))).toBe(false)
  })

  it('reintenta una vez cuando el error no es de la API (fallo de red)', () => {
    const retry = getRetry()

    expect(retry(0, new TypeError('Failed to fetch'))).toBe(true)
    expect(retry(1, new TypeError('Failed to fetch'))).toBe(false)
  })

  it('mantiene la caché fresca 5 minutos y no refresca al volver a enfocar la ventana', () => {
    const options = createQueryClient().getDefaultOptions().queries

    expect(options?.staleTime).toBe(300_000)
    expect(options?.refetchOnWindowFocus).toBe(false)
  })

  it('devuelve un cliente distinto en cada llamada', () => {
    expect(createQueryClient()).not.toBe(createQueryClient())
  })
})
