import { http, HttpResponse, delay } from 'msw'
import {
  mockCurrentUser,
  mockUsers,
  mockDashboard,
  toPublicProfile,
  buildAdminUserList,
  mockGroupDetails,
  mockGroupMembers,
  mockJoinRequests,
  buildGroupList,
  buildMyGroupsList,
  mockProblems,
  buildProblemList,
  mockProblemStatistics,
} from './data'
import type { User } from '@/types/user'
import type { ProblemDetail } from '@/types/problem'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

function url(path: string) {
  return `${API_URL}${path}`
}

export const handlers = [
  // === Auth ===

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

  http.post(url('/password/recovery'), async () => {
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

  http.post(url('/users/deactivation/request'), async () => {
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

  // === Groups ===

  // List groups
  http.get(url('/groups'), async ({ request }) => {
    await delay(300)
    const sp = new URL(request.url).searchParams
    const result = buildGroupList({
      page: Number(sp.get('page')) || 1,
      limit: Number(sp.get('limit')) || 10,
      search: sp.get('search') || undefined,
      joinPolicy: sp.get('joinPolicy') || undefined,
      visibility: sp.get('visibility') || undefined,
    })
    return HttpResponse.json(result)
  }),

  // Group detail
  http.get(url('/groups/:id'), async ({ params }) => {
    await delay(200)
    const { id } = params as { id: string }
    const detail = mockGroupDetails[id]
    if (!detail) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Grupo no encontrado' }, { status: 404 })
    }
    return HttpResponse.json(detail)
  }),

  // My groups
  http.get(url('/users/me/groups'), async ({ request }) => {
    await delay(300)
    const sp = new URL(request.url).searchParams
    const result = buildMyGroupsList({
      page: Number(sp.get('page')) || 1,
      limit: Number(sp.get('limit')) || 10,
      search: sp.get('search') || undefined,
      role: sp.get('role') || undefined,
    })
    return HttpResponse.json(result)
  }),

  // Create group
  http.post(url('/groups'), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({
      id: 'group-new-' + Date.now(),
      name: body.name,
      description: body.description || null,
      visibility: body.visibility,
      joinPolicy: body.joinPolicy,
      isGlobal: false,
      createdAt: new Date().toISOString(),
    }, { status: 201 })
  }),

  // Update group
  http.patch(url('/groups/:id'), async ({ request, params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const body = (await request.json()) as Record<string, unknown>
    const existing = mockGroupDetails[id]
    return HttpResponse.json({
      ...(existing || { id }),
      ...body,
      updatedAt: new Date().toISOString(),
    })
  }),

  // Delete group
  http.delete(url('/groups/:id'), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as { confirmationName?: string }
    if (!body.confirmationName) {
      return HttpResponse.json({ error: 'CONFIRMATION_REQUIRED', message: 'Confirmation name is required' }, { status: 400 })
    }
    return HttpResponse.json({
      message: 'Group deleted successfully',
      deletedGroup: { id: 'deleted', name: body.confirmationName },
      deletionSummary: { contestsDeleted: 0, materialsDeleted: 0, standingCollectionsDeleted: 0, submissionsOrphaned: 0, membersRemoved: 0 },
    })
  }),

  // Group members
  http.get(url('/groups/:groupId/members'), async ({ params }) => {
    await delay(200)
    const { groupId } = params as { groupId: string }
    const members = mockGroupMembers[groupId] || []
    return HttpResponse.json({
      members,
      pagination: { page: 1, limit: 50, total: members.length, totalPages: 1 },
    })
  }),

  // Add member
  http.post(url('/groups/:groupId/members'), async ({ request, params }) => {
    await delay(300)
    const { groupId } = params as { groupId: string }
    const body = (await request.json()) as { nickname: string; role: string }
    return HttpResponse.json({
      groupId,
      userId: 'u-new',
      nickname: body.nickname,
      name: body.nickname,
      role: body.role,
      joinedAt: new Date().toISOString(),
    }, { status: 201 })
  }),

  // Remove member
  http.delete(url('/groups/:groupId/members/:nickname'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  // Change member role
  http.patch(url('/groups/:groupId/members/:nickname'), async ({ request, params }) => {
    await delay(300)
    const { groupId, nickname } = params as { groupId: string; nickname: string }
    const body = (await request.json()) as { role: string }
    return HttpResponse.json({
      groupId,
      userId: 'u-x',
      nickname,
      name: nickname,
      role: body.role,
      joinedAt: '2024-06-01T10:00:00Z',
    })
  }),

  // Leave group
  http.delete(url('/groups/:groupId/members/me'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  // Join group (OPEN)
  http.post(url('/groups/:groupId/join'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  // Join requests
  http.get(url('/groups/:groupId/requests'), async ({ params }) => {
    await delay(200)
    const { groupId } = params as { groupId: string }
    const requests = mockJoinRequests[groupId] || []
    return HttpResponse.json({
      requests,
      pagination: { page: 1, limit: 50, total: requests.length, totalPages: 1 },
    })
  }),

  // Create join request
  http.post(url('/groups/:groupId/requests'), async ({ params }) => {
    await delay(300)
    const { groupId } = params as { groupId: string }
    return HttpResponse.json({
      id: 'req-new',
      groupId,
      requester: { userId: 'u1', nickname: 'luisadmin', name: 'Luis Admin' },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    }, { status: 201 })
  }),

  // Cancel join request
  http.delete(url('/groups/:groupId/requests/me'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  // Process join request
  http.patch(url('/groups/:groupId/requests/:requestId'), async ({ request, params }) => {
    await delay(300)
    const { groupId, requestId } = params as { groupId: string; requestId: string }
    const body = (await request.json()) as { status: string }
    return HttpResponse.json({
      id: requestId,
      groupId,
      requester: { userId: 'u6', nickname: 'sofiarodriguez', name: 'Sofía Rodríguez' },
      status: body.status,
      createdAt: '2026-03-10T14:00:00Z',
    })
  }),

  // Create invitation
  http.post(url('/groups/:groupId/invitations'), async ({ params }) => {
    await delay(300)
    const { groupId } = params as { groupId: string }
    return HttpResponse.json({
      id: 'inv-new',
      groupId,
      inviteeUserId: 'u-resolved',
      invitationUrl: `https://training-center.com/groups/${groupId}/accept?token=mock-jwt-token`,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    }, { status: 201 })
  }),

  // List invitations
  http.get(url('/groups/:groupId/invitations'), async () => {
    await delay(200)
    return HttpResponse.json({
      invitations: [],
      pagination: { page: 1, size: 20, totalItems: 0, totalPages: 0 },
    })
  }),

  // Accept invitation
  http.post(url('/groups/:groupId/accept'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  // === Problems ===

  // List problems
  http.get(url('/problems'), async ({ request }) => {
    await delay(300)
    const sp = new URL(request.url).searchParams
    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const userNickname = token.replace('mock-jwt-token-', '')

    const result = buildProblemList({
      page: Number(sp.get('page')) || 1,
      limit: Number(sp.get('limit')) || 20,
      status: sp.get('status') || undefined,
      accessibility: sp.get('accessibility') || undefined,
      tags: sp.get('tags') || undefined,
      author: sp.get('author') || undefined,
      userNickname,
    })
    return HttpResponse.json(result)
  }),

  // Problem detail
  http.get(url('/problems/:slug'), async ({ params, request }) => {
    await delay(200)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }

    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const userNickname = token.replace('mock-jwt-token-', '')

    if (problem.status === 'DRAFT') {
      const isAdmin = userNickname === 'luisadmin'
      const isModifier = problem.modifiers?.some((m) => m.nickname === userNickname)
      if (!isAdmin && !isModifier) {
        return HttpResponse.json({ error: 'INSUFFICIENT_PERMISSIONS', message: 'No tienes permisos para ver este problema en borrador' }, { status: 403 })
      }
    }

    // Strip modifiers/files for non-modifiers
    const isAdmin = userNickname === 'luisadmin'
    const isModifier = problem.modifiers?.some((m) => m.nickname === userNickname)
    if (!isAdmin && !isModifier) {
      const { modifiers, files, ...publicData } = problem
      return HttpResponse.json(publicData)
    }

    return HttpResponse.json(problem)
  }),

  // Create problem
  http.post(url('/problems'), async ({ request }) => {
    await delay(300)
    const auth = request.headers.get('Authorization')
    if (!auth) return HttpResponse.json({ error: 'UNAUTHORIZED', message: 'Token requerido' }, { status: 401 })

    const token = auth.replace('Bearer ', '')
    const userNickname = token.replace('mock-jwt-token-', '')
    const user = mockUsers.find((u) => u.nickname === userNickname) || mockCurrentUser

    if (user.role === 'CONTESTANT') {
      return HttpResponse.json({ error: 'INSUFFICIENT_PERMISSIONS', message: 'Solo Coach y Admin pueden crear problemas' }, { status: 403 })
    }

    const body = (await request.json()) as Record<string, unknown>

    // Check duplicate slug
    if (mockProblems.some((p) => p.slug === body.slug)) {
      return HttpResponse.json({ error: 'SLUG_ALREADY_EXISTS', message: `Ya existe un problema con slug '${body.slug}'` }, { status: 409 })
    }

    const newProblem: ProblemDetail = {
      slug: body.slug as string,
      title: body.title as string,
      statement: (body.statement as string) || null,
      timeLimit: (body.timeLimit as number) || null,
      memoryLimit: (body.memoryLimit as number) || null,
      languageOverrides: (body.languageOverrides as []) || [],
      tags: (body.tags as string[]) || [],
      status: 'DRAFT',
      accessibility: 'PRIVATE',
      author: { nickname: user.nickname, name: user.name },
      modifiers: [{ nickname: user.nickname, name: user.name }],
      files: { testCases: false, solutions: [], checker: false, validator: false },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      problemJudgingUpdatedAt: null,
    }

    mockProblems.push(newProblem)
    return HttpResponse.json(newProblem, { status: 201 })
  }),

  // Update problem
  http.put(url('/problems/:slug'), async ({ params, request }) => {
    await delay(300)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    if (problem.status === 'PUBLISHED') {
      return HttpResponse.json({ error: 'PROBLEM_IS_PUBLISHED', message: 'No se puede modificar un problema publicado. Despublícalo primero.' }, { status: 400 })
    }

    const body = (await request.json()) as Record<string, unknown>
    const updated = { ...problem, ...body, updatedAt: new Date().toISOString() }
    const idx = mockProblems.findIndex((p) => p.slug === slug)
    mockProblems[idx] = updated as ProblemDetail
    return HttpResponse.json(updated)
  }),

  // Delete problem
  http.delete(url('/problems/:slug'), async ({ params, request }) => {
    await delay(300)
    const { slug } = params as { slug: string }
    const idx = mockProblems.findIndex((p) => p.slug === slug)
    if (idx === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }

    const body = (await request.json()) as { confirmSlug?: string }
    if (!body.confirmSlug || body.confirmSlug !== slug) {
      return HttpResponse.json({ error: 'SLUG_MISMATCH', message: 'El slug de confirmación no coincide' }, { status: 400 })
    }

    mockProblems.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // Publish
  http.post(url('/problems/:slug/publish'), async ({ params }) => {
    await delay(400)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    if (problem.status === 'PUBLISHED') {
      return HttpResponse.json({ error: 'ALREADY_PUBLISHED', message: 'El problema ya está publicado' }, { status: 409 })
    }

    problem.status = 'PUBLISHED'
    problem.updatedAt = new Date().toISOString()
    return HttpResponse.json({
      slug: problem.slug,
      status: 'PUBLISHED',
      message: 'Problema publicado exitosamente',
      validationLogs: ['✓ Campos requeridos validados', '✓ Casos de prueba válidos', '✓ Solución compilada', '✓ Solución pasó todos los casos'],
    })
  }),

  // Unpublish
  http.post(url('/problems/:slug/unpublish'), async ({ params }) => {
    await delay(300)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    if (problem.status === 'DRAFT') {
      return HttpResponse.json({ error: 'ALREADY_DRAFT', message: 'El problema ya está en borrador' }, { status: 409 })
    }

    problem.status = 'DRAFT'
    problem.updatedAt = new Date().toISOString()
    return HttpResponse.json({ slug: problem.slug, status: 'DRAFT', message: 'Problema despublicado. Ahora puedes hacer cambios.' })
  }),

  // Statistics
  http.get(url('/problems/:slug/statistics'), async ({ params }) => {
    await delay(300)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    if (problem.status === 'DRAFT') {
      return HttpResponse.json({ error: 'PROBLEM_NOT_PUBLISHED', message: 'Las estadísticas solo están disponibles para problemas publicados' }, { status: 403 })
    }

    const stats = mockProblemStatistics[slug]
    if (!stats) {
      return HttpResponse.json({ message: 'No hay submissions aún para este problema', totalSubmissions: 0 })
    }
    return HttpResponse.json(stats)
  }),

  // Upload file (mock)
  http.post(url('/problems/:slug/files'), async ({ params }) => {
    await delay(500)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    return HttpResponse.json({
      message: 'Archivo subido exitosamente',
      fileType: 'testCases',
      fileName: 'testcases.zip',
      files: problem.files || { testCases: true, solutions: [], checker: false, validator: false },
    })
  }),
]
