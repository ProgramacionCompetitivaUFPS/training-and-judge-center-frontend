import { http, HttpResponse, delay } from 'msw'
import {
  mockGroupDetails,
  mockGroupMembers,
  mockJoinRequests,
  mockInvitations,
  buildGroupList,
  buildMyGroupsList,
} from '../data'
import { url } from './utils'

export const groupsHandlers = [
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
      hasActiveContests: sp.get('hasActiveContests') === 'true' || undefined,
      sortBy: sp.get('sortBy') || undefined,
      order: sp.get('order') || undefined,
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
      sortBy: sp.get('sortBy') || undefined,
      order: sp.get('order') || undefined,
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

  // Leave group — registered before the generic ':nickname' routes below, since
  // MSW matches handlers in array order and ':nickname' would otherwise also match 'me'.
  http.delete(url('/groups/:groupId/members/me'), async ({ params, request }) => {
    await delay(300)
    const { groupId } = params as { groupId: string }
    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const userNickname = token.replace('mock-jwt-token-', '')

    const members = mockGroupMembers[groupId] || []
    const me = members.find((m) => m.nickname === userNickname)
    const leadCount = members.filter((m) => m.role === 'LEAD').length
    if (me?.role === 'LEAD' && leadCount <= 1) {
      return HttpResponse.json({
        error: 'CANNOT_LEAVE_AS_LAST_LEAD',
        message: 'No puedes salir del grupo porque eres el único líder. Asigna otro líder primero.',
      }, { status: 400 })
    }

    return new HttpResponse(null, { status: 204 })
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

  // Join group (OPEN)
  http.post(url('/groups/:groupId/join'), async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  // Join requests
  http.get(url('/groups/:groupId/requests'), async ({ params, request }) => {
    await delay(200)
    const { groupId } = params as { groupId: string }
    const sp = new URL(request.url).searchParams
    const status = sp.get('status')
    const page = Number(sp.get('page')) || 1
    const limit = Number(sp.get('limit')) || 50
    const filtered = (mockJoinRequests[groupId] || []).filter((r) => !status || r.status === status)
    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    return HttpResponse.json({
      requests: filtered.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total, totalPages },
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

  // My join request for this group (404 if never requested)
  http.get(url('/groups/:groupId/requests/me'), async ({ params, request }) => {
    await delay(200)
    const { groupId } = params as { groupId: string }
    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const userNickname = token.replace('mock-jwt-token-', '')

    const myRequest = (mockJoinRequests[groupId] || []).find((r) => r.requester.nickname === userNickname)
    if (!myRequest) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'No tienes una solicitud para este grupo' }, { status: 404 })
    }
    return HttpResponse.json(myRequest)
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

  // Create invitation — note: the real backend never returns a ready-made link, only `id`;
  // the frontend builds the accept URL itself from groupId + id. Body uses userId/userNickname/
  // userEmail (matching the real backend's generateInviteReq); omitting all three creates a
  // general invitation with no resolved invitee.
  http.post(url('/groups/:groupId/invitations'), async ({ params, request }) => {
    await delay(300)
    const { groupId } = params as { groupId: string }
    const body = (await request.json().catch(() => ({}))) as { userId?: string; userNickname?: string; userEmail?: string }
    const invitee = body.userId || body.userNickname || body.userEmail
      ? {
          userId: 'u-resolved',
          nickname: body.userNickname || 'usuarioinvitado',
          name: 'Usuario Invitado',
          email: body.userEmail || 'invitado@trainingcenter.com',
        }
      : undefined
    return HttpResponse.json({
      id: 'inv-' + Date.now(),
      groupId,
      invitee,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    }, { status: 201 })
  }),

  // List invitations
  http.get(url('/groups/:groupId/invitations'), async ({ params, request }) => {
    await delay(200)
    const { groupId } = params as { groupId: string }
    const sp = new URL(request.url).searchParams
    const page = Number(sp.get('page')) || 1
    const size = Number(sp.get('size')) || 20
    const invitations = mockInvitations[groupId] || []
    const totalItems = invitations.length
    const totalPages = totalItems > 0 ? Math.max(1, Math.ceil(totalItems / size)) : 0
    return HttpResponse.json({
      invitations: invitations.slice((page - 1) * size, page * size),
      pagination: { page, size, totalItems, totalPages },
    })
  }),

  // Accept invitation — invitationId travels in the JSON body, not the URL (real backend
  // resolves identity purely from invitationId + the authenticated JWT user, no token at all).
  http.post(url('/groups/:groupId/invitations/accept'), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as { invitationId?: string }
    if (!body.invitationId) {
      return HttpResponse.json({ error: 'INVALID_REQUEST', message: 'invitationId es requerido' }, { status: 400 })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
