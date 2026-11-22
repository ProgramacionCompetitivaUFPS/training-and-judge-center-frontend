import { http, HttpResponse } from 'msw'

import { mockCurrentUser, mockDashboard } from '@/mocks/data'
import type { User } from '@/types/user'
import { server } from './server'

// Reuses ONLY the fixtures of src/mocks/data (the project's Object Mother); none of the development
// handlers in src/mocks/handlers: the backend below is written for these tests and is stateful per call.

export const API = 'http://localhost:8080/api'
export const VALID_PASSWORD = 'Correcta123!'

type TestUser = User & { id: string }

export function makeUser(overrides: Partial<TestUser> & Pick<TestUser, 'nickname' | 'name' | 'email' | 'role'>): TestUser {
  return { ...mockCurrentUser, id: `user-${overrides.nickname}`, googleLinked: false, hasPassword: true, ...overrides }
}

export const ANA = makeUser({ nickname: 'ana', name: 'Ana Pérez', email: 'ana@correo.com', role: 'CONTESTANT' })
export const BETO = makeUser({ nickname: 'beto', name: 'Beto Ruiz', email: 'beto@correo.com', role: 'COACH' })
export const ROOT = makeUser({ nickname: 'root', name: 'Root Admin', email: 'root@correo.com', role: 'ADMIN' })

export const tokenOf = (user: User) => `token-${user.nickname}`

/**
 * Registers a minimal auth backend: login (valid password: VALID_PASSWORD), refresh, logout, the current
 * user and the dashboard. `session` says who is signed in server-side (the refresh cookie).
 */
export function installAuthBackend(users: TestUser[], options: { signedInAs?: TestUser } = {}) {
  const session: { user: TestUser | null } = { user: options.signedInAs ?? null }
  const requests: string[] = []

  const userForToken = (header: string | null) => {
    const token = header?.replace('Bearer ', '')
    return users.find((u) => tokenOf(u) === token)
  }

  server.use(
    http.post(`${API}/auth/login`, async ({ request }) => {
      requests.push('login')
      const { email, password } = (await request.json()) as { email: string; password: string }
      const user = users.find((u) => u.email === email)
      if (!user || password !== VALID_PASSWORD) {
        return HttpResponse.json({ error: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas' }, { status: 401 })
      }
      session.user = user
      return HttpResponse.json({ token: tokenOf(user), user })
    }),
    http.post(`${API}/auth/refresh`, () => {
      requests.push('refresh')
      if (!session.user) return HttpResponse.json({ error: 'UNAUTHORIZED', message: 'sin sesión' }, { status: 401 })
      return HttpResponse.json({ token: tokenOf(session.user), sessionExpiresAt: '2099-01-01T00:00:00Z' })
    }),
    http.post(`${API}/auth/logout`, () => {
      requests.push('logout')
      session.user = null
      return new HttpResponse(null, { status: 204 })
    }),
    http.get(`${API}/users/me`, ({ request }) => {
      const user = userForToken(request.headers.get('Authorization'))
      if (!user) return HttpResponse.json({ error: 'UNAUTHORIZED', message: 'token inválido' }, { status: 401 })
      return HttpResponse.json(user)
    }),
    http.get(`${API}/users/me/dashboard`, () => HttpResponse.json(mockDashboard)),
  )

  return { session, requests }
}
