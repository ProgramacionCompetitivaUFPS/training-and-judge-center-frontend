import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'

import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  subscribe,
  isLoggingOut,
  setLoggingOut,
  notifySessionExpired,
  resetSessionExpiredNotified,
  subscribeSessionExpired,
  markSessionActive,
  clearSessionMark,
  hasSessionMark,
} from './tokenStore'

afterEach(() => {
  clearAccessToken()
  setLoggingOut(false)
  resetSessionExpiredNotified()
  localStorage.clear()
})

describe('getAccessToken / setAccessToken / clearAccessToken', () => {
  it('devuelve null inicialmente', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('devuelve el token tras setAccessToken', () => {
    setAccessToken('abc-token')
    expect(getAccessToken()).toBe('abc-token')
  })

  it('devuelve null tras clearAccessToken', () => {
    setAccessToken('abc-token')
    clearAccessToken()
    expect(getAccessToken()).toBeNull()
  })

  it('setAccessToken(null) limpia el token', () => {
    setAccessToken('abc-token')
    setAccessToken(null)
    expect(getAccessToken()).toBeNull()
  })
})

describe('subscribe', () => {
  it('llama al listener cuando cambia el token', () => {
    const listener = vi.fn()
    subscribe(listener)
    setAccessToken('new-token')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('el unsuscribe devuelto elimina el listener', () => {
    const listener = vi.fn()
    const unsub = subscribe(listener)
    unsub()
    setAccessToken('new-token')
    expect(listener).not.toHaveBeenCalled()
  })

  it('llama a todos los listeners suscritos', () => {
    const a = vi.fn()
    const b = vi.fn()
    subscribe(a)
    subscribe(b)
    setAccessToken('t')
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })
})

describe('loggingOut flag', () => {
  it('isLoggingOut() comienza en false', () => {
    expect(isLoggingOut()).toBe(false)
  })

  it('setLoggingOut(true) hace que isLoggingOut() devuelva true', () => {
    setLoggingOut(true)
    expect(isLoggingOut()).toBe(true)
  })

  it('setLoggingOut(false) lo resetea', () => {
    setLoggingOut(true)
    setLoggingOut(false)
    expect(isLoggingOut()).toBe(false)
  })
})

describe('notifySessionExpired', () => {
  it('llama al listener suscrito en la primera llamada', () => {
    const listener = vi.fn()
    subscribeSessionExpired(listener)
    notifySessionExpired()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('no vuelve a llamar al listener en llamadas sucesivas (deduplicado)', () => {
    const listener = vi.fn()
    subscribeSessionExpired(listener)
    notifySessionExpired()
    notifySessionExpired()
    notifySessionExpired()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('resetSessionExpiredNotified permite que vuelva a disparar', () => {
    const listener = vi.fn()
    subscribeSessionExpired(listener)
    notifySessionExpired()
    resetSessionExpiredNotified()
    notifySessionExpired()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('setAccessToken con un token real resetea la deduplicación', () => {
    const listener = vi.fn()
    subscribeSessionExpired(listener)
    notifySessionExpired()
    setAccessToken('new-valid-token')
    notifySessionExpired()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('subscribeSessionExpired', () => {
  it('el unsuscribe devuelto elimina el listener de sesión expirada', () => {
    const listener = vi.fn()
    const unsub = subscribeSessionExpired(listener)
    unsub()
    notifySessionExpired()
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('session mark (localStorage flag)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('hasSessionMark devuelve false cuando no hay flag', () => {
    expect(hasSessionMark()).toBe(false)
  })

  it('markSessionActive escribe el flag; hasSessionMark devuelve true', () => {
    markSessionActive()
    expect(hasSessionMark()).toBe(true)
  })

  it('clearSessionMark elimina el flag; hasSessionMark vuelve a false', () => {
    markSessionActive()
    clearSessionMark()
    expect(hasSessionMark()).toBe(false)
  })

  it('markSessionActive es idempotente', () => {
    markSessionActive()
    markSessionActive()
    expect(hasSessionMark()).toBe(true)
  })

  it('clearSessionMark no lanza si el flag no existe', () => {
    expect(() => clearSessionMark()).not.toThrow()
  })
})

describe('session mark — localStorage no disponible', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('markSessionActive no lanza cuando localStorage lanza', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => markSessionActive()).not.toThrow()
  })

  it('clearSessionMark no lanza cuando localStorage lanza', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => clearSessionMark()).not.toThrow()
  })

  it('hasSessionMark devuelve false cuando localStorage lanza', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(hasSessionMark()).toBe(false)
  })
})

describe('session mark — BroadcastChannel logout', () => {
  let sender: BroadcastChannel

  afterEach(() => {
    sender?.close()
    localStorage.clear()
  })

  it('limpia el session mark cuando otra pestaña hace logout', async () => {
    markSessionActive()
    expect(hasSessionMark()).toBe(true)

    sender = new BroadcastChannel('auth-logout')
    sender.postMessage('logout')

    await waitFor(() => expect(hasSessionMark()).toBe(false))
  })
})
