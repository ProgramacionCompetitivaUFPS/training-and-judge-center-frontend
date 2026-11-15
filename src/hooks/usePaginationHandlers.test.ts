import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { usePaginationHandlers } from './usePaginationHandlers'

interface Params {
  page?: number
  limit?: number
  search?: string
}

describe('usePaginationHandlers', () => {
  it('handlePageChange actualiza page preservando el resto del estado', () => {
    const { result } = renderHook(() => {
      const [state, setState] = useState<Params>({ page: 1, limit: 20, search: 'test' })
      const handlers = usePaginationHandlers(setState)
      return { state, ...handlers }
    })

    act(() => result.current.handlePageChange(3))

    expect(result.current.state.page).toBe(3)
    expect(result.current.state.limit).toBe(20)
    expect(result.current.state.search).toBe('test')
  })

  it('handleLimitChange actualiza limit y resetea page a 1', () => {
    const { result } = renderHook(() => {
      const [state, setState] = useState<Params>({ page: 5, limit: 10, search: 'algo' })
      const handlers = usePaginationHandlers(setState)
      return { state, ...handlers }
    })

    act(() => result.current.handleLimitChange(50))

    expect(result.current.state.limit).toBe(50)
    expect(result.current.state.page).toBe(1)
    expect(result.current.state.search).toBe('algo')
  })

  it('múltiples cambios de página se acumulan correctamente', () => {
    const { result } = renderHook(() => {
      const [state, setState] = useState<Params>({ page: 1, limit: 20 })
      const handlers = usePaginationHandlers(setState)
      return { state, ...handlers }
    })

    act(() => result.current.handlePageChange(2))
    act(() => result.current.handlePageChange(4))

    expect(result.current.state.page).toBe(4)
  })
})
