import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { markSessionActive } from '@/lib/tokenStore'
import { server } from './support/server'
import { renderApp } from './support/renderApp'
import { API, ANA, BETO, ROOT, VALID_PASSWORD, installAuthBackend } from './support/authBackend'

afterEach(() => {
  vi.unstubAllGlobals()
})

async function signIn(user: ReturnType<typeof userEvent.setup>, email: string, password = VALID_PASSWORD) {
  await user.type(await screen.findByPlaceholderText('tu@correo.com'), email)
  await user.type(screen.getByPlaceholderText('••••••••'), password)
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
}

describe('login y redirección', () => {
  it('un competidor que inicia sesión llega al dashboard con su nombre', async () => {
    installAuthBackend([ANA])
    const user = userEvent.setup()
    renderApp({ route: '/login' })

    await signIn(user, 'ana@correo.com')

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana' })).toBeInTheDocument()
  })

  it('una URL protegida sin sesión lleva al login y, tras entrar, vuelve a esa URL', async () => {
    installAuthBackend([ANA])
    server.use(http.get(`${API}/users/me/sole-lead-groups`, () => HttpResponse.json({ groups: [] })))
    const user = userEvent.setup()
    renderApp({ route: '/settings' })

    await signIn(user, 'ana@correo.com')

    expect(await screen.findByRole('heading', { name: 'Configuración' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Ana' })).not.toBeInTheDocument()
  })

  it('con credenciales incorrectas avisa y se queda en el login', async () => {
    installAuthBackend([ANA])
    const user = userEvent.setup()
    renderApp({ route: '/login' })

    await signIn(user, 'ana@correo.com', 'Equivocada1!')

    expect(await screen.findByText('Credenciales incorrectas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('una sesión abierta se recupera al recargar sin pedir credenciales', async () => {
    installAuthBackend([ANA], { signedInAs: ANA })
    markSessionActive()

    renderApp({ route: '/dashboard' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('tu@correo.com')).not.toBeInTheDocument()
  })
})

describe('acceso por rol', () => {
  it.each([
    ['CONTESTANT', ANA, '/problems/new'],
    ['CONTESTANT', ANA, '/admin/users'],
    ['COACH', BETO, '/admin/users'],
  ])('un %s que abre %s directamente recibe la página de «no encontrado»', async (_role, who, route) => {
    installAuthBackend([who], { signedInAs: who })
    markSessionActive()

    renderApp({ route })

    expect(await screen.findByText('404')).toBeInTheDocument()
  })

  it('un administrador sí entra a la gestión de usuarios', async () => {
    installAuthBackend([ROOT, ANA], { signedInAs: ROOT })
    markSessionActive()
    server.use(
      http.get(`${API}/admin/users`, () =>
        HttpResponse.json({
          users: [ANA],
          pagination: { page: 1, limit: 5, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        }),
      ),
      http.get(`${API}/admin/users/filters`, () => HttpResponse.json({ countries: [], cities: [], institutions: [] })),
    )

    renderApp({ route: '/admin/users' })

    expect(await screen.findByText('@ana')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Gestión de Usuarios' })).toBeInTheDocument()
  })

  it('el enlace de usuarios del menú lateral solo existe para el administrador', async () => {
    installAuthBackend([ANA], { signedInAs: ANA })
    markSessionActive()

    renderApp({ route: '/dashboard' })
    await screen.findByRole('heading', { level: 1, name: 'Ana' })

    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
  })
})

describe('cierre de sesión', () => {
  it('tras cerrar sesión y entrar otra persona no queda ningún dato de la anterior', async () => {
    const backend = installAuthBackend([ANA, BETO], { signedInAs: ANA })
    server.use(http.get(`${API}/users/me/sole-lead-groups`, () => HttpResponse.json({ groups: [] })))
    markSessionActive()
    vi.stubGlobal('location', { href: '/settings', origin: 'http://localhost:3000' })
    const user = userEvent.setup()
    renderApp({ route: '/settings' })
    expect(await screen.findByDisplayValue('Ana Pérez')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /ana/ }))
    await user.click(await screen.findByRole('menuitem', { name: /Cerrar sesión/ }))
    await signIn(user, 'beto@correo.com')

    // Another person signing in is NOT sent back to the previous person's last page (/settings): dashboard instead
    expect(await screen.findByRole('heading', { level: 1, name: 'Beto' })).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Ana Pérez')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Configuración' })).not.toBeInTheDocument()
    expect(backend.requests).toContain('logout')
  })

  it('si la sesión expira en el servidor avisa y devuelve al login', async () => {
    const backend = installAuthBackend([ANA], { signedInAs: ANA })
    server.use(
      http.get(`${API}/users/me/sole-lead-groups`, () => HttpResponse.json({ groups: [] })),
      http.put(`${API}/users`, () =>
        HttpResponse.json({ error: 'UNAUTHORIZED', message: 'sesión vencida' }, { status: 401 }),
      ),
    )
    markSessionActive()
    const user = userEvent.setup()
    renderApp({ route: '/settings' })
    await screen.findByDisplayValue('Ana Pérez')

    backend.session.user = null // the refresh cookie is gone: the server will answer 401 to the refresh too
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    expect(await screen.findByText('Sesión expirada')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByPlaceholderText('tu@correo.com')).toBeInTheDocument())
  })
})
