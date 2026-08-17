import { http, HttpResponse, delay } from 'msw'
import {
  mockCurrentUser,
  mockUsers,
  toPublicProfile,
  buildAdminUserList,
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

  // User search/autocomplete — Coach/Admin only. Registered before ':nickname' below, since
  // MSW matches handlers in array order and ':nickname' would otherwise also match 'search'.
  http.get(url('/users/search'), async ({ request }) => {
    await delay(200)
    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const viewerNickname = token.replace('mock-jwt-token-', '')
    const viewer = mockUsers.find((u) => u.nickname === viewerNickname)
    if (viewer?.role !== 'ADMIN' && viewer?.role !== 'COACH') {
      return HttpResponse.json({ error: 'FORBIDDEN', message: 'Requiere rol Coach o Administrador' }, { status: 403 })
    }

    const sp = new URL(request.url).searchParams
    const q = (sp.get('q') || '').trim()
    if (q.length < 2) {
      return HttpResponse.json(
        { error: 'VALIDATION_ERROR', message: 'q debe tener al menos 2 caracteres', details: [{ field: 'q', message: 'Mínimo 2 caracteres' }] },
        { status: 400 }
      )
    }
    const limit = Math.min(Number(sp.get('limit')) || 10, 20)
    const needle = q.toLowerCase()
    // Only name/nickname match — email/institution no longer searched (avoids the endpoint
    // doubling as an oracle for whether an email exists on the platform).
    const results = mockUsers
      .filter((u) => u.status === 'ACTIVE')
      .filter((u) =>
        u.name.toLowerCase().includes(needle) ||
        u.nickname.toLowerCase().includes(needle)
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((u) => ({ id: u.id, nickname: u.nickname, name: u.name }))

    return HttpResponse.json({ users: results })
  }),

  // Get user by nickname (public profile) — full payload (email/country/city/updatedAt)
  // only when the viewer is Admin or is viewing their own profile.
  http.get(url('/users/:nickname'), async ({ params, request }) => {
    await delay(200)
    const { nickname } = params as { nickname: string }
    const user = mockUsers.find((u) => u.nickname === nickname)

    if (!user || user.status === 'DEACTIVATED') {
      return HttpResponse.json(
        { error: 'NOT_FOUND', message: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const viewerNickname = token.replace('mock-jwt-token-', '')
    const viewer = mockUsers.find((u) => u.nickname === viewerNickname)
    const full = viewer?.role === 'ADMIN' || viewerNickname === nickname

    return HttpResponse.json(toPublicProfile(user, full))
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

  // === Admin ===

  http.get(url('/admin/users'), async ({ request }) => {
    await delay(300)
    const searchParams = new URL(request.url).searchParams

    const result = buildAdminUserList({
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
      search: searchParams.get('searchTerm') || undefined,
      role: searchParams.get('role') || undefined,
      status: searchParams.get('status') || undefined,
      sort: searchParams.get('sort') || undefined,
      order: searchParams.get('order') || undefined,
    })

    return HttpResponse.json(result)
  }),

  http.put(url('/admin/users/:id'), async ({ params, request }) => {
    await delay(300)
    const { id } = params as { id: string }
    const idx = mockUsers.findIndex((u) => u.id === id)
    if (idx === -1) {
      return HttpResponse.json({ error: 'USER_NOT_FOUND', message: 'Usuario no encontrado' }, { status: 404 })
    }
    const body = (await request.json()) as Record<string, string>
    const updated = { ...mockUsers[idx], ...body, updatedAt: new Date().toISOString() }
    mockUsers[idx] = updated
    return HttpResponse.json(updated)
  }),

  http.post(url('/admin/users/:id/deactivate'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),
]
