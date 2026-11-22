import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useToast } from './useToast'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useToast', () => {
  it('agrega un aviso con la duración de 5 segundos por omisión', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ variant: 'default', title: 'Guardado' })
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0]).toMatchObject({ variant: 'default', title: 'Guardado', duration: 5000 })
  })

  it('devuelve el id del aviso creado', () => {
    const { result } = renderHook(() => useToast())
    let id = ''

    act(() => {
      id = result.current.toast({ variant: 'default', title: 'Hola' })
    })

    expect(id).not.toBe('')
    expect(result.current.toasts[0].id).toBe(id)
  })

  it('conserva el orden de llegada cuando hay varios avisos', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ variant: 'default', title: 'Primero' })
      result.current.toast({ variant: 'default', title: 'Segundo' })
    })

    expect(result.current.toasts.map((t) => t.title)).toEqual(['Primero', 'Segundo'])
  })

  it('quita el aviso solo cuando termina su duración', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.toast({ variant: 'default', title: 'Efímero', duration: 3000 })
    })

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('al vencer un aviso no afecta a los demás', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.toast({ variant: 'default', title: 'Corto', duration: 1000 })
      result.current.toast({ variant: 'default', title: 'Largo', duration: 8000 })
    })

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.toasts.map((t) => t.title)).toEqual(['Largo'])
  })

  it('con duración 0 el aviso permanece hasta que se descarta', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.toast({ variant: 'default', title: 'Fijo', duration: 0 })
    })

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(result.current.toasts).toHaveLength(1)
  })

  it('dismiss quita solo el aviso indicado', () => {
    const { result } = renderHook(() => useToast())
    let first = ''
    act(() => {
      first = result.current.toast({ variant: 'default', title: 'Uno', duration: 0 })
      result.current.toast({ variant: 'default', title: 'Dos', duration: 0 })
    })

    act(() => {
      result.current.dismiss(first)
    })

    expect(result.current.toasts.map((t) => t.title)).toEqual(['Dos'])
  })

  it('dismissAll quita todos los avisos', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.toast({ variant: 'default', title: 'Uno', duration: 0 })
      result.current.toast({ variant: 'default', title: 'Dos', duration: 0 })
    })

    act(() => {
      result.current.dismissAll()
    })

    expect(result.current.toasts).toEqual([])
  })
})
