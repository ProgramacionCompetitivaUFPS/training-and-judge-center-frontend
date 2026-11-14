import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebounce', () => {
  it('retorna el valor inicial sin esperar el delay', () => {
    const { result } = renderHook(() => useDebounce('hola', 300))

    expect(result.current).toBe('hola')
  })

  it('no actualiza el valor antes de que transcurra el delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'inicial' },
    })

    rerender({ value: 'nuevo' })
    act(() => vi.advanceTimersByTime(299))

    expect(result.current).toBe('inicial')
  })

  it('actualiza el valor al completarse el delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'inicial' },
    })

    rerender({ value: 'nuevo' })
    act(() => vi.advanceTimersByTime(300))

    expect(result.current).toBe('nuevo')
  })

  it('cancela el timer previo si el valor cambia antes del delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'b' })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: 'c' })
    // Avanza hasta donde vencería el timer de 'b' — sin clearTimeout se actualizaría a 'b'
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('a')

    // Ahora vence el timer de 'c'
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('c')
  })

  it('usa 300ms como delay por defecto', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'x' },
    })

    rerender({ value: 'y' })
    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('x')

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('y')
  })
})
