import { http, HttpResponse, delay } from 'msw'
import {
  mockCurrentUser,
  mockUsers,
  toPublicProfile,
  buildAdminUserList,
  mockDashboard,
} from '../data'
import { url } from './utils'

export const usersHandlers = [
  // === Profile ===

  // Get current user
  http.get(url('/users/me'), async ({ request }) => {
    await delay(200)
    const auth = request.headers.get('Authorization')
    if (!auth) {
      return HttpResponse.json(
        { error: 'UNAUTHORIZED', message: 'Token requerido' },
        { status: 401 }
      )
    }

    // Extract nickname from mock token
    const token = auth.replace('Bearer ', '')
    const nickname = token.replace('mock-jwt-token-', '')
    const user = mockUsers.find((u) => u.nickname === nickname) || mockCurrentUser

    return HttpResponse.json(user)
  }),

  // Get user by nickname (public profile)
  http.get(url('/users/:nickname'), async ({ params }) => {
    await delay(200)
    const { nickname } = params as { nickname: string }
    const user = mockUsers.find((u) => u.nickname === nickname)

    if (!user || user.status === 'DEACTIVATED') {
      return HttpResponse.json(
        { error: 'NOT_FOUND', message: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return HttpResponse.json(toPublicProfile(user))
  }),

  // Update profile
  http.put(url('/users'), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as Record<string, string>

    return HttpResponse.json({
      ...mockCurrentUser,
      ...body,
      updatedAt: new Date().toISOString(),
    })
  }),

  // === Password ===

  http.put(url('/users/password'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(url('/password/forgot'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(url('/password/reset'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  // === Email Change ===

  http.post(url('/users/email-change/request'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(url('/users/email-change/confirm'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  // === Deactivation ===

  http.post(url('/users/deactivation'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(url('/users/deactivation/confirm'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  // === Dashboard ===

  http.get(url('/users/me/dashboard'), async () => {
    await delay(300)
    return HttpResponse.json(mockDashboard)
  }),

  // === Admin ===

  http.get(url('/admin/users'), async ({ request }) => {
    await delay(300)
    const searchParams = new URL(request.url).searchParams

    const result = buildAdminUserList({
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      status: searchParams.get('status') || undefined,
    })

    return HttpResponse.json(result)
  }),

  http.put(url('/admin/users/:id'), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as Record<string, string>
    return HttpResponse.json({ ...mockCurrentUser, ...body, updatedAt: new Date().toISOString() })
  }),

  http.post(url('/admin/users/:id/deactivate'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),
]
