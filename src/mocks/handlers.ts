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
  mockSubmissions,
  buildMySubmissionsList,
  buildProblemSubmissionsList,
  mockContests,
  buildContestList,
  mockStandings,
  mockContestSubmissions,
  mockMaterials,
  buildMaterialList,
  mockMyTeams,
  mockTeamDetails,
  mockTeamInvitations,
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
      const { modifiers: _modifiers, files: _files, ...publicData } = problem
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
      inputFormat: null,
      outputFormat: null,
      examples: [],
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

  // === Submissions ===

  // My submissions
  http.get(url('/users/me/submissions'), async ({ request }) => {
    await delay(300)
    const sp = new URL(request.url).searchParams
    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const userNickname = token.replace('mock-jwt-token-', '')

    const result = buildMySubmissionsList({
      page: Number(sp.get('page')) || 1,
      limit: Number(sp.get('limit')) || 20,
      verdict: sp.get('verdict') || undefined,
      problemSlug: sp.get('problemSlug') || undefined,
      language: sp.get('language') || undefined,
      userNickname: userNickname || 'luisadmin',
    })
    return HttpResponse.json(result)
  }),

  // Submission detail
  http.get(url('/submissions/:id'), async ({ params }) => {
    await delay(200)
    const { id } = params as { id: string }
    const submission = mockSubmissions.find((s) => s.id === id)
    if (!submission) {
      return HttpResponse.json({ error: 'SUBMISSION_NOT_FOUND', message: 'Submission no encontrada' }, { status: 404 })
    }
    return HttpResponse.json(submission)
  }),

  // Download submission
  http.get(url('/submissions/:id/download'), async ({ params }) => {
    await delay(200)
    const { id } = params as { id: string }
    const submission = mockSubmissions.find((s) => s.id === id)
    if (!submission) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Submission no encontrada' }, { status: 404 })
    }
    const ext = submission.language === 'cpp20' ? 'cpp' : submission.language === 'java17' ? 'java' : 'py'
    return new HttpResponse(submission.sourceCode, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${submission.submittedBy.nickname}_${submission.id.slice(0, 8)}.${ext}"`,
      },
    })
  }),

  // Update visibility
  http.patch(url('/submissions/:id/visibility'), async ({ params, request }) => {
    await delay(200)
    const { id } = params as { id: string }
    const submission = mockSubmissions.find((s) => s.id === id)
    if (!submission) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Submission no encontrada' }, { status: 404 })
    }
    const body = (await request.json()) as { visibility: 'PUBLIC' | 'PRIVATE' }
    submission.visibility = body.visibility
    return HttpResponse.json({ id: submission.id, visibility: submission.visibility, message: 'Visibilidad actualizada' })
  }),

  // List problem submissions
  http.get(url('/problems/:slug/submissions'), async ({ params, request }) => {
    await delay(200)
    const { slug } = params as { slug: string }
    const searchParams = new URL(request.url).searchParams
    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const userNickname = token.replace('mock-jwt-token-', '')
    const result = buildProblemSubmissionsList({
      problemSlug: slug,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      verdict: searchParams.get('verdict') || undefined,
      language: searchParams.get('language') || undefined,
      mine: searchParams.get('mine') === 'true',
      userNickname: userNickname || undefined,
    })
    return HttpResponse.json(result)
  }),

  // Submit solution (practice)
  http.post(url('/problems/:slug/submissions'), async ({ params, request }) => {
    await delay(500)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    if (problem.status !== 'PUBLISHED') {
      return HttpResponse.json({ error: 'PROBLEM_NOT_PUBLISHED', message: 'Solo problemas publicados aceptan submissions' }, { status: 400 })
    }

    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    // userNickname available for future use
    void token

    const newId = 'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
    return HttpResponse.json({
      id: newId,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      problem: { slug: problem.slug, title: problem.title },
      language: 'cpp20',
      compiler: 'g++',
      fileSize: 1024,
      fileHash: 'mock-hash-' + newId,
    }, { status: 201 })
  }),

  // Submit solution (contest)
  http.post(url('/groups/:groupId/contests/:contestId/problems/:slug/submissions'), async ({ params }) => {
    await delay(500)
    const { slug } = params as { groupId: string; contestId: string; slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    const newId = 'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
    return HttpResponse.json({
      id: newId,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      problem: { slug, title: problem?.title || slug },
      language: 'cpp20',
      compiler: 'g++',
      fileSize: 1024,
      fileHash: 'mock-hash-' + newId,
    }, { status: 201 })
  }),

  // === Contests ===

  // List contests in group
  http.get(url('/groups/:groupId/contests'), async ({ params, request }) => {
    await delay(300)
    const { groupId } = params as { groupId: string }
    const sp = new URL(request.url).searchParams
    const result = buildContestList({
      groupId,
      page: Number(sp.get('page')) || 1,
      limit: Number(sp.get('limit')) || 20,
      status: sp.get('status') || undefined,
      sortBy: sp.get('sortBy') || undefined,
      sortOrder: sp.get('sortOrder') || undefined,
    })
    return HttpResponse.json(result)
  }),

  // Contest detail
  http.get(url('/contests/:id'), async ({ params }) => {
    await delay(200)
    const { id } = params as { id: string }
    const contest = mockContests.find((c) => c.id === id)
    if (!contest) {
      return HttpResponse.json({ error: 'CONTEST_NOT_FOUND', message: 'Contest no encontrado' }, { status: 404 })
    }
    return HttpResponse.json(contest)
  }),

  // Create contest
  http.post(url('/groups/:groupId/contests'), async ({ params, request }) => {
    await delay(300)
    const { groupId } = params as { groupId: string }
    const body = (await request.json()) as Record<string, unknown>
    const newContest = {
      id: 'contest-new-' + Date.now(),
      name: body.name as string,
      description: (body.description as string) || null,
      startTime: body.startTime as string,
      endTime: body.endTime as string,
      duration: Math.floor((new Date(body.endTime as string).getTime() - new Date(body.startTime as string).getTime()) / 1000),
      status: 'SCHEDULED' as const,
      penalty: (body.penalty as number) || 20,
      freezeMinutes: body.freezeMinutes !== undefined ? body.freezeMinutes as number | null : 60,
      enablePostContest: (body.enablePostContest as boolean) || false,
      locked: false,
      participantCount: 0,
      isRegistered: false,
      participationMode: 'INDIVIDUAL' as const,
      showTeamMembers: false,
      group: { id: groupId, name: 'Mock Group' },
      owner: { id: 'u1', nickname: 'luisadmin' },
      problems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return HttpResponse.json(newContest, { status: 201 })
  }),

  // Update contest
  http.put(url('/groups/:groupId/contests/:contestId'), async ({ params, request }) => {
    await delay(300)
    const { contestId } = params as { groupId: string; contestId: string }
    const contest = mockContests.find((c) => c.id === contestId)
    if (!contest) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Contest no encontrado' }, { status: 404 })
    }
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...contest, ...body, updatedAt: new Date().toISOString() })
  }),

  // Delete contest
  http.delete(url('/groups/:groupId/contests/:contestId'), async ({ params }) => {
    await delay(300)
    const { contestId } = params as { groupId: string; contestId: string }
    const idx = mockContests.findIndex((c) => c.id === contestId)
    if (idx === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Contest no encontrado' }, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // Register to contest
  http.post(url('/groups/:groupId/contests/:contestId/register'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  // Unregister from contest
  http.delete(url('/groups/:groupId/contests/:contestId/register'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  // Registration status
  http.get(url('/groups/:groupId/contests/:contestId/register/status'), async ({ params }) => {
    await delay(200)
    const { contestId } = params as { groupId: string; contestId: string }
    const contest = mockContests.find((c) => c.id === contestId)
    return HttpResponse.json({
      registered: contest?.isRegistered || false,
      registeredAt: contest?.isRegistered ? '2026-03-15T10:00:00Z' : undefined,
    })
  }),

  // Registrations list
  http.get(url('/groups/:groupId/contests/:contestId/registrations'), async () => {
    await delay(200)
    return HttpResponse.json({
      registrations: [
        { nickname: 'carloscp', registeredAt: '2026-03-15T10:00:00Z' },
        { nickname: 'anagarcia', registeredAt: '2026-03-15T11:00:00Z' },
        { nickname: 'sofiarodriguez', registeredAt: '2026-03-15T12:00:00Z' },
      ],
      pagination: { page: 1, limit: 50, total: 3, totalPages: 1, hasMore: false },
    })
  }),

  // Standings
  http.get(url('/contests/:contestId/standings'), async ({ params }) => {
    await delay(300)
    const { contestId } = params as { contestId: string }
    const contest = mockContests.find((c) => c.id === contestId)
    if (!contest) {
      return HttpResponse.json({ error: 'CONTEST_NOT_FOUND', message: 'Contest no encontrado' }, { status: 404 })
    }
    return HttpResponse.json({
      contest: {
        id: contest.id,
        name: contest.name,
        status: contest.status,
        startTime: contest.startTime,
        endTime: contest.endTime,
        penalty: contest.penalty,
        freezeMinutes: contest.freezeMinutes,
        isFrozen: false,
        frozenAt: null,
      },
      problems: contest.problems.map((p) => ({ position: p.position, slug: p.slug, title: p.title })),
      standings: mockStandings,
      pagination: { page: 1, limit: 50, total: mockStandings.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      filters: { country: null, city: null, institution: null, filteredTotal: mockStandings.length },
    })
  }),

  // Contest submissions
  http.get(url('/groups/:groupId/contests/:contestId/submissions'), async ({ params }) => {
    await delay(300)
    const { contestId } = params as { groupId: string; contestId: string }
    const contest = mockContests.find((c) => c.id === contestId)
    if (!contest) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Contest no encontrado' }, { status: 404 })
    }
    return HttpResponse.json({
      contest: {
        id: contest.id,
        name: contest.name,
        status: contest.status,
        startTime: contest.startTime,
        endTime: contest.endTime,
        freezeMinutes: contest.freezeMinutes,
      },
      submissions: mockContestSubmissions,
      pagination: { page: 1, limit: 50, total: mockContestSubmissions.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    })
  }),

  // === Materials ===

  // List materials in group
  http.get(url('/groups/:groupId/materials'), async ({ params, request }) => {
    await delay(300)
    const { groupId } = params as { groupId: string }
    const sp = new URL(request.url).searchParams
    const result = buildMaterialList({
      groupId,
      page: Number(sp.get('page')) || 1,
      limit: Number(sp.get('limit')) || 20,
      pinned: sp.get('pinned') || undefined,
      tags: sp.get('tags') || undefined,
      q: sp.get('q') || undefined,
    })
    return HttpResponse.json(result)
  }),

  // Material detail
  http.get(url('/groups/:groupId/materials/:materialId'), async ({ params }) => {
    await delay(200)
    const { materialId } = params as { groupId: string; materialId: string }
    const material = mockMaterials.find((m) => m.id === materialId)
    if (!material) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    return HttpResponse.json(material)
  }),

  // Create material
  http.post(url('/groups/:groupId/materials'), async ({ params, request }) => {
    await delay(300)
    const { groupId } = params as { groupId: string }
    const body = (await request.json()) as Record<string, unknown>
    const newMaterial = {
      id: 'mat-new-' + Date.now(),
      title: body.title as string,
      content: (body.content as string) || '',
      tags: (body.tags as string[]) || [],
      status: 'DRAFT' as const,
      pinned: false,
      pinnedAt: null,
      author: { nickname: 'luisadmin', name: 'Luis Admin' },
      group: { id: groupId, name: 'Mock Group' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
    }
    return HttpResponse.json(newMaterial, { status: 201 })
  }),

  // Update material
  http.put(url('/groups/:groupId/materials/:materialId'), async ({ params, request }) => {
    await delay(300)
    const { materialId } = params as { groupId: string; materialId: string }
    const material = mockMaterials.find((m) => m.id === materialId)
    if (!material) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...material, ...body, updatedAt: new Date().toISOString() })
  }),

  // Delete material
  http.delete(url('/groups/:groupId/materials/:materialId'), async ({ params }) => {
    await delay(200)
    const { materialId } = params as { groupId: string; materialId: string }
    const idx = mockMaterials.findIndex((m) => m.id === materialId)
    if (idx === -1) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // Publish material
  http.post(url('/groups/:groupId/materials/:materialId/publish'), async ({ params }) => {
    await delay(200)
    const { materialId } = params as { groupId: string; materialId: string }
    const material = mockMaterials.find((m) => m.id === materialId)
    if (!material) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    return HttpResponse.json({
      ...material,
      status: 'PUBLISHED',
      publishedAt: material.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }),

  // Unpublish material
  http.post(url('/groups/:groupId/materials/:materialId/unpublish'), async ({ params }) => {
    await delay(200)
    const { materialId } = params as { groupId: string; materialId: string }
    const material = mockMaterials.find((m) => m.id === materialId)
    if (!material) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    return HttpResponse.json({
      ...material,
      status: 'DRAFT',
      pinned: false,
      pinnedAt: null,
      updatedAt: new Date().toISOString(),
    })
  }),

  // Pin material
  http.post(url('/groups/:groupId/materials/:materialId/pin'), async ({ params }) => {
    await delay(200)
    const { materialId } = params as { groupId: string; materialId: string }
    const material = mockMaterials.find((m) => m.id === materialId)
    if (!material) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    if (material.status === 'DRAFT') {
      return HttpResponse.json({ error: 'CANNOT_PIN_DRAFT', message: 'No se puede fijar un borrador' }, { status: 400 })
    }
    return HttpResponse.json({
      ...material,
      pinned: true,
      pinnedAt: material.pinnedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }),

  // Unpin material
  http.post(url('/groups/:groupId/materials/:materialId/unpin'), async ({ params }) => {
    await delay(200)
    const { materialId } = params as { groupId: string; materialId: string }
    const material = mockMaterials.find((m) => m.id === materialId)
    if (!material) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    return HttpResponse.json({
      ...material,
      pinned: false,
      pinnedAt: null,
      updatedAt: new Date().toISOString(),
    })
  }),

  // === Teams ===

  // My teams
  http.get(url('/users/me/teams'), async () => {
    await delay(200)
    return HttpResponse.json({
      teams: mockMyTeams,
      pagination: { page: 1, limit: 20, total: mockMyTeams.length, totalPages: 1 },
    })
  }),

  // Team detail
  http.get(url('/teams/:teamId'), async ({ params }) => {
    await delay(200)
    const { teamId } = params as { teamId: string }
    const team = mockTeamDetails[teamId]
    if (!team) {
      return HttpResponse.json({ error: 'TEAM_NOT_FOUND', message: 'Equipo no encontrado' }, { status: 404 })
    }
    return HttpResponse.json(team)
  }),

  // Create team
  http.post(url('/teams'), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as { name: string }
    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const userNickname = token.replace('mock-jwt-token-', '')

    // Check name uniqueness
    const exists = Object.values(mockTeamDetails).some(
      (t) => t.name.toLowerCase() === body.name.trim().toLowerCase()
    )
    if (exists) {
      return HttpResponse.json({ error: 'TEAM_NAME_EXISTS', message: 'Ya existe un equipo con este nombre' }, { status: 409 })
    }

    const newId = 'team-new-' + Date.now()
    return HttpResponse.json({
      id: newId,
      name: body.name.trim(),
      createdBy: userNickname,
      createdAt: new Date().toISOString(),
      members: [{ userId: 'u1', nickname: userNickname, joinedAt: new Date().toISOString() }],
    }, { status: 201 })
  }),

  // Invite member
  http.post(url('/teams/:teamId/invitations'), async ({ params, request }) => {
    await delay(300)
    const { teamId } = params as { teamId: string }
    const body = (await request.json()) as { nickname: string }
    const team = mockTeamDetails[teamId]
    if (!team) {
      return HttpResponse.json({ error: 'TEAM_NOT_FOUND', message: 'Equipo no encontrado' }, { status: 404 })
    }

    // Check if already member
    if (team.members.some((m) => m.nickname === body.nickname)) {
      return HttpResponse.json({ error: 'ALREADY_MEMBER', message: 'El usuario ya es miembro del equipo' }, { status: 409 })
    }

    // Check if already invited
    if (team.pendingInvitations.some((i) => i.invitee.nickname === body.nickname)) {
      return HttpResponse.json({ error: 'ALREADY_INVITED', message: 'El usuario ya tiene una invitación pendiente' }, { status: 409 })
    }

    return HttpResponse.json({
      id: 'tinv-' + Date.now(),
      teamId,
      inviteeUser: { id: 'u-resolved', nickname: body.nickname },
      invitedBy: { id: 'u1', nickname: 'luisadmin' },
      createdAt: new Date().toISOString(),
    }, { status: 201 })
  }),

  // Team members
  http.get(url('/teams/:teamId/members'), async ({ params }) => {
    await delay(200)
    const { teamId } = params as { teamId: string }
    const team = mockTeamDetails[teamId]
    if (!team) {
      return HttpResponse.json({ error: 'TEAM_NOT_FOUND', message: 'Equipo no encontrado' }, { status: 404 })
    }
    return HttpResponse.json({
      members: team.members.map((m) => ({ userId: m.id, nickname: m.nickname, joinedAt: m.joinedAt })),
    })
  }),

  // Leave team
  http.delete(url('/teams/:teamId/members/me'), async ({ params }) => {
    await delay(300)
    const { teamId } = params as { teamId: string }
    const team = mockTeamDetails[teamId]
    if (!team) {
      return HttpResponse.json({ error: 'TEAM_NOT_FOUND', message: 'Equipo no encontrado' }, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // My team invitations
  http.get(url('/users/me/team-invitations'), async () => {
    await delay(200)
    return HttpResponse.json({
      invitations: mockTeamInvitations,
      pagination: { page: 1, limit: 20, total: mockTeamInvitations.length, totalPages: 1 },
    })
  }),

  // Accept team invitation
  http.post(url('/team-invitations/:invitationId/accept'), async () => {
    await delay(300)
    return HttpResponse.json({
      team: mockTeamDetails['team-1'],
      joinedAt: new Date().toISOString(),
    })
  }),

  // Reject team invitation
  http.delete(url('/team-invitations/:invitationId'), async () => {
    await delay(200)
    return new HttpResponse(null, { status: 204 })
  }),

  // Contest team registrations
  http.get(url('/contests/:contestId/team-registrations'), async () => {
    await delay(200)
    return HttpResponse.json({ teams: [], total: 0 })
  }),

  // Register team to contest
  http.post(url('/contests/:contestId/team-registrations'), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as { teamId: string; selectedMembers: string[] }
    return HttpResponse.json({
      id: 'reg-' + Date.now(),
      contestId: 'contest-1',
      team: { id: body.teamId, name: 'Mock Team' },
      selectedMembers: body.selectedMembers.map((id) => ({ id, nickname: 'user-' + id.slice(-4) })),
      registeredAt: new Date().toISOString(),
    }, { status: 201 })
  }),

  // Update team registration
  http.put(url('/contests/:contestId/team-registrations/:teamId'), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as { selectedMembers: string[] }
    return HttpResponse.json({
      id: 'reg-updated',
      contestId: 'contest-1',
      team: { id: 'team-1', name: 'Mock Team' },
      selectedMembers: body.selectedMembers.map((id) => ({ id, nickname: 'user-' + id.slice(-4) })),
      registeredAt: new Date().toISOString(),
    })
  }),

  // Unregister team from contest
  http.delete(url('/contests/:contestId/team-registrations/:teamId'), async () => {
    await delay(200)
    return new HttpResponse(null, { status: 204 })
  }),
]
