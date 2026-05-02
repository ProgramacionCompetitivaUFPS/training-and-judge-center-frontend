import { http, HttpResponse, delay } from 'msw'
import { mockUsers, mockCurrentUser } from '../data'
import type { User } from '@/types/user'
import { url } from './utils'

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

  // Register
  // NOTE: POST /users is register (auth flow), not profile update
  http.post(url('/users'), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as Record<string, string>

    const newUser: User = {
      email: body.email,
      name: body.name,
      lastname: body.lastname,
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
