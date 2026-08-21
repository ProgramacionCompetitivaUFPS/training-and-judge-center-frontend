import { http, HttpResponse, delay } from 'msw'
import { mockUsers, mockCurrentUser } from '../data'
import type { User } from '@/types/user'
import { url } from './utils'
import { mockGoogleLinkedByNickname, mockHasPasswordByNickname } from './users'

export const authHandlers = [
  // Login
  http.post(url('/auth/login'), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as { email: string; password: string }

    // Accept any email/password combo — just find user by email or use default
    const user = mockUsers.find((u) => u.email === body.email) || mockCurrentUser

    return HttpResponse.json({
      token: 'mock-jwt-token-' + user.nickname,
      user,
    })
  }),

  // Google login — mock always succeeds and logs in as the default mock user.
  // Simulates a Google-only account (linked, no password) the first time, so the
  // "Crear Contraseña" flow and CANNOT_UNLINK_LAST_CREDENTIAL are reproducible.
  http.post(url('/auth/google'), async () => {
    await delay(300)
    const user = mockCurrentUser
    mockGoogleLinkedByNickname.set(user.nickname, true)
    if (!mockHasPasswordByNickname.has(user.nickname)) {
      mockHasPasswordByNickname.set(user.nickname, false)
    }

    return HttpResponse.json({
      token: 'mock-jwt-token-' + user.nickname,
      sessionExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      user: {
        ...user,
        googleLinked: true,
        hasPassword: mockHasPasswordByNickname.get(user.nickname),
      },
    })
  }),

  // Register
  // NOTE: POST /users is register (auth flow), not profile update
  http.post(url('/users'), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as Record<string, string>

    const newUser: User = {
      email: body.email,
      name: body.name,
      nickname: body.nickname,
      country: body.country,
      city: body.city,
      institution: body.institution,
      role: 'CONTESTANT',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    }

    return HttpResponse.json(newUser, { status: 201 })
  }),
]
