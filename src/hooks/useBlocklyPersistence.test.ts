import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useBlocklyPersistence } from './useBlocklyPersistence'

const VALID_XML = '<xml xmlns="https://developers.google.com/blockly/xml"><block type="print"></block></xml>'

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useBlocklyPersistence', () => {
  it('guarda el workspace en sessionStorage bajo la clave del problema', () => {
    const { result } = renderHook(() => useBlocklyPersistence('two-sum'))

    result.current.save(VALID_XML)

    expect(sessionStorage.getItem('blockly-workspace-two-sum')).toBe(VALID_XML)
  })

  it('carga el workspace guardado cuando es XML válido', () => {
    sessionStorage.setItem('blockly-workspace-two-sum', VALID_XML)
    const { result } = renderHook(() => useBlocklyPersistence('two-sum'))

    expect(result.current.load()).toBe(VALID_XML)
  })

  it('devuelve null cuando no hay nada guardado', () => {
    const { result } = renderHook(() => useBlocklyPersistence('two-sum'))

    expect(result.current.load()).toBeNull()
  })

  it('no mezcla los workspaces de problemas distintos', () => {
    sessionStorage.setItem('blockly-workspace-two-sum', VALID_XML)
    const { result } = renderHook(() => useBlocklyPersistence('fizz-buzz'))

    expect(result.current.load()).toBeNull()
  })

  it('usa la clave del problema nuevo cuando cambia el slug', () => {
    sessionStorage.setItem('blockly-workspace-fizz-buzz', VALID_XML)
    const { result, rerender } = renderHook(({ slug }) => useBlocklyPersistence(slug), {
      initialProps: { slug: 'two-sum' },
    })
    expect(result.current.load()).toBeNull()

    rerender({ slug: 'fizz-buzz' })

    expect(result.current.load()).toBe(VALID_XML)
  })

  it('descarta y borra un XML corrupto en vez de devolverlo', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    sessionStorage.setItem('blockly-workspace-two-sum', '<xml><block></xml>')
    const { result } = renderHook(() => useBlocklyPersistence('two-sum'))

    expect(result.current.load()).toBeNull()

    expect(sessionStorage.getItem('blockly-workspace-two-sum')).toBeNull()
    expect(warn).toHaveBeenCalledWith('Blockly: XML corrupto descartado para problema:', 'two-sum')
  })

  it('clear elimina el workspace guardado', () => {
    sessionStorage.setItem('blockly-workspace-two-sum', VALID_XML)
    const { result } = renderHook(() => useBlocklyPersistence('two-sum'))

    result.current.clear()

    expect(sessionStorage.getItem('blockly-workspace-two-sum')).toBeNull()
  })

  it('save avisa por consola y no lanza cuando sessionStorage está lleno', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const { result } = renderHook(() => useBlocklyPersistence('two-sum'))

    expect(() => result.current.save(VALID_XML)).not.toThrow()

    expect(warn).toHaveBeenCalledWith('Blockly: no se pudo guardar en sessionStorage')
  })

  it('load devuelve null cuando sessionStorage no está disponible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const { result } = renderHook(() => useBlocklyPersistence('two-sum'))

    expect(result.current.load()).toBeNull()
  })

  it('clear no lanza cuando sessionStorage no está disponible', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const { result } = renderHook(() => useBlocklyPersistence('two-sum'))

    expect(() => result.current.clear()).not.toThrow()
  })
})
