import { http, HttpResponse, delay } from 'msw'
import { mockMyTeams, mockTeamDetails, mockTeamInvitations } from '../data'
import { url } from './utils'

export const teamsHandlers = [
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
