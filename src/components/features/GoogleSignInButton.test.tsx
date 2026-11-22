import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

// The button reads VITE_GOOGLE_CLIENT_ID and googleIdentity keeps module-level state, so every test
// loads a fresh copy of both with the environment it needs.
async function loadButton(clientId: string | undefined) {
  vi.resetModules()
  if (clientId === undefined) vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
  else vi.stubEnv('VITE_GOOGLE_CLIENT_ID', clientId)
  const { GoogleSignInButton } = await import('./GoogleSignInButton')
  return GoogleSignInButton
}

function installGoogle() {
  const accountsId = { initialize: vi.fn(), renderButton: vi.fn() }
  window.google = { accounts: { id: accountsId } }
  return accountsId
}

beforeEach(() => {
  document.head.innerHTML = ''
  delete window.google
})

afterEach(() => {
  vi.unstubAllEnvs()
  delete window.google
  document.head.innerHTML = ''
})

describe('GoogleSignInButton', () => {
  it('no renderiza nada cuando no hay client id configurado', async () => {
    const GoogleSignInButton = await loadButton(undefined)
    const accountsId = installGoogle()

    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
    expect(accountsId.renderButton).not.toHaveBeenCalled()
  })

  it('pinta el botón de Google con el texto pedido', async () => {
    const GoogleSignInButton = await loadButton('client-123')
    const accountsId = installGoogle()

    render(<GoogleSignInButton onCredential={vi.fn()} text="signup_with" />)

    await waitFor(() => expect(accountsId.renderButton).toHaveBeenCalledTimes(1))
    expect(accountsId.renderButton.mock.calls[0][1]).toEqual({
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signup_with',
      shape: 'rectangular',
      width: 320,
    })
    expect(accountsId.initialize.mock.calls[0][0].client_id).toBe('client-123')
  })

  it('usa continue_with como texto por defecto', async () => {
    const GoogleSignInButton = await loadButton('client-123')
    const accountsId = installGoogle()

    render(<GoogleSignInButton onCredential={vi.fn()} />)

    await waitFor(() => expect(accountsId.renderButton).toHaveBeenCalled())
    expect(accountsId.renderButton.mock.calls[0][1].text).toBe('continue_with')
  })

  it('entrega el id_token recibido de Google a onCredential', async () => {
    const GoogleSignInButton = await loadButton('client-123')
    const accountsId = installGoogle()
    const onCredential = vi.fn()
    render(<GoogleSignInButton onCredential={onCredential} />)
    await waitFor(() => expect(accountsId.initialize).toHaveBeenCalled())

    accountsId.initialize.mock.calls[0][0].callback({ credential: 'id-token-9' })

    expect(onCredential).toHaveBeenCalledWith('id-token-9')
  })

  it('entrega el token a la versión más reciente de onCredential sin volver a pintar el botón', async () => {
    const GoogleSignInButton = await loadButton('client-123')
    const accountsId = installGoogle()
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<GoogleSignInButton onCredential={first} />)
    await waitFor(() => expect(accountsId.renderButton).toHaveBeenCalledTimes(1))

    rerender(<GoogleSignInButton onCredential={second} />)
    accountsId.initialize.mock.calls[0][0].callback({ credential: 'tok' })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('tok')
    expect(accountsId.renderButton).toHaveBeenCalledTimes(1)
  })

  it('ignora el token que llega después de desmontar el botón', async () => {
    const GoogleSignInButton = await loadButton('client-123')
    const accountsId = installGoogle()
    const onCredential = vi.fn()
    const { unmount } = render(<GoogleSignInButton onCredential={onCredential} />)
    await waitFor(() => expect(accountsId.initialize).toHaveBeenCalled())

    unmount()
    accountsId.initialize.mock.calls[0][0].callback({ credential: 'late' })

    expect(onCredential).not.toHaveBeenCalled()
  })

  it('deja de mostrar el contenedor cuando el script de Google no se puede cargar', async () => {
    const GoogleSignInButton = await loadButton('client-123')

    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} />)
    await waitFor(() => expect(document.head.querySelector('script')).not.toBeNull())
    document.head.querySelector('script')?.onerror?.(new Event('error'))

    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
