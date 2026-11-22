import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

// The module keeps the loading promise and the initialized client id in module scope, so every test
// gets a fresh copy of it.
async function freshModule() {
  vi.resetModules()
  return import('./googleIdentity')
}

function googleScripts() {
  return document.head.querySelectorAll<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
}

function fakeAccountsId() {
  return { initialize: vi.fn(), renderButton: vi.fn() }
}

beforeEach(() => {
  document.head.innerHTML = ''
  delete window.google
})

afterEach(() => {
  document.head.innerHTML = ''
  delete window.google
})

describe('loadGoogleIdentity', () => {
  it('inserta el script de Google una sola vez y resuelve con accounts.id cuando carga', async () => {
    const { loadGoogleIdentity } = await freshModule()
    const accountsId = fakeAccountsId()

    const first = loadGoogleIdentity()
    const second = loadGoogleIdentity()
    window.google = { accounts: { id: accountsId } }
    googleScripts()[0].onload?.(new Event('load'))

    await expect(first).resolves.toBe(accountsId)
    await expect(second).resolves.toBe(accountsId)
    expect(googleScripts()).toHaveLength(1)
    expect(googleScripts()[0].async).toBe(true)
  })

  it('no inserta el script cuando Google ya está cargado en la página', async () => {
    const { loadGoogleIdentity } = await freshModule()
    const accountsId = fakeAccountsId()
    window.google = { accounts: { id: accountsId } }

    await expect(loadGoogleIdentity()).resolves.toBe(accountsId)

    expect(googleScripts()).toHaveLength(0)
  })

  it('rechaza con un error claro cuando el script no se puede descargar', async () => {
    const { loadGoogleIdentity } = await freshModule()

    const promise = loadGoogleIdentity()
    googleScripts()[0].onerror?.(new Event('error'))

    await expect(promise).rejects.toThrow('Failed to load Google Identity Services')
  })

  it('espera al script que ya estaba en el documento en vez de insertar otro', async () => {
    const { loadGoogleIdentity } = await freshModule()
    const existing = document.createElement('script')
    existing.src = SCRIPT_SRC
    document.head.appendChild(existing)
    const accountsId = fakeAccountsId()

    const promise = loadGoogleIdentity()
    window.google = { accounts: { id: accountsId } }
    existing.dispatchEvent(new Event('load'))

    await expect(promise).resolves.toBe(accountsId)
    expect(googleScripts()).toHaveLength(1)
  })

  it('rechaza cuando el script que ya estaba en el documento falla al cargar', async () => {
    const { loadGoogleIdentity } = await freshModule()
    const existing = document.createElement('script')
    existing.src = SCRIPT_SRC
    document.head.appendChild(existing)

    const promise = loadGoogleIdentity()
    existing.dispatchEvent(new Event('error'))

    await expect(promise).rejects.toThrow('Failed to load Google Identity Services')
  })
})

describe('initializeGoogleIdentity', () => {
  it('inicializa Google con el client id y entrega el id_token al manejador activo', async () => {
    const { initializeGoogleIdentity } = await freshModule()
    const accountsId = fakeAccountsId()
    const onCredential = vi.fn()

    initializeGoogleIdentity(accountsId, 'client-1', onCredential)
    const config = accountsId.initialize.mock.calls[0][0]
    config.callback({ credential: 'id-token-1' })

    expect(accountsId.initialize).toHaveBeenCalledTimes(1)
    expect(config.client_id).toBe('client-1')
    expect(onCredential).toHaveBeenCalledWith('id-token-1')
  })

  it('no vuelve a inicializar con el mismo client id pero sí cambia el manejador activo', async () => {
    const { initializeGoogleIdentity } = await freshModule()
    const accountsId = fakeAccountsId()
    const firstHandler = vi.fn()
    const secondHandler = vi.fn()

    initializeGoogleIdentity(accountsId, 'client-1', firstHandler)
    initializeGoogleIdentity(accountsId, 'client-1', secondHandler)
    accountsId.initialize.mock.calls[0][0].callback({ credential: 'tok' })

    expect(accountsId.initialize).toHaveBeenCalledTimes(1)
    expect(firstHandler).not.toHaveBeenCalled()
    expect(secondHandler).toHaveBeenCalledWith('tok')
  })

  it('vuelve a inicializar cuando cambia el client id', async () => {
    const { initializeGoogleIdentity } = await freshModule()
    const accountsId = fakeAccountsId()

    initializeGoogleIdentity(accountsId, 'client-1', vi.fn())
    initializeGoogleIdentity(accountsId, 'client-2', vi.fn())

    expect(accountsId.initialize).toHaveBeenCalledTimes(2)
    expect(accountsId.initialize.mock.calls[1][0].client_id).toBe('client-2')
  })
})
