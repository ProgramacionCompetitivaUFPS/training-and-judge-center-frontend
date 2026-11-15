import { describe, it, expect, vi, afterEach } from 'vitest'

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
} from './tokenStore'

afterEach(() => {
  clearAccessToken()
  setLoggingOut(false)
  resetSessionExpiredNotified()
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
