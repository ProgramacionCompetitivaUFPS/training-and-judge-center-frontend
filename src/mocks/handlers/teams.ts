import { http, HttpResponse, delay } from 'msw'
import { mockMyTeams, mockTeamDetails, mockTeamInvitations, mockTeamRegistrations, mockContests } from '../data'
import { url } from './utils'

export const teamsHandlers = [
  // My teams
  http.get(url('/users/me/teams'), async ({ request }) => {
    await delay(200)
    const sp = new URL(request.url).searchParams
    const page = Number(sp.get('page')) || 1
    const limit = Number(sp.get('limit')) || 20
    const start = (page - 1) * limit
    const paged = mockMyTeams.slice(start, start + limit)
    return HttpResponse.json({
      teams: paged,
      pagination: { page, limit, total: mockMyTeams.length, totalPages: Math.ceil(mockMyTeams.length / limit) || 1 },
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

    const isInActiveContest = mockContests.some((c) => {
      if (c.status !== 'ACTIVE') return false
      return (mockTeamRegistrations[c.id] || []).some((r) => r.team.id === teamId)
    })
    if (isInActiveContest) {
      return HttpResponse.json({
        error: 'CANNOT_LEAVE_DURING_ACTIVE_CONTEST',
        message: 'No puedes salir del equipo mientras esté seleccionado en una competencia activa',
      }, { status: 409 })
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
  http.get(url('/groups/:groupId/contests/:contestId/team-registrations'), async ({ params }) => {
    await delay(200)
    const { contestId } = params as { groupId: string; contestId: string }
    const teams = mockTeamRegistrations[contestId] || []
    return HttpResponse.json({ teams, total: teams.length })
  }),

  // Register team to contest
  http.post(url('/groups/:groupId/contests/:contestId/team-registrations/:teamId'), async ({ params, request }) => {
    await delay(300)
    const { contestId, teamId } = params as { groupId: string; contestId: string; teamId: string }
    const body = (await request.json()) as { selectedMembers: string[] }
    const team = mockTeamDetails[teamId]
    if (!team) {
      return HttpResponse.json({ error: 'TEAM_NOT_FOUND', message: 'Equipo no encontrado' }, { status: 404 })
    }

    const existing = mockTeamRegistrations[contestId] || []
    if (existing.some((r) => r.team.id === teamId)) {
      return HttpResponse.json({ error: 'ALREADY_REGISTERED', message: 'Este equipo ya está registrado' }, { status: 409 })
    }

    const registration = {
      team: { id: team.id, name: team.name },
      selectedMembers: body.selectedMembers.map((id) => {
        const member = team.members.find((m) => m.id === id)
        return { id, nickname: member?.nickname || id }
      }),
      registeredAt: new Date().toISOString(),
    }
    mockTeamRegistrations[contestId] = [...existing, registration]

    const contest = mockContests.find((c) => c.id === contestId)
    if (contest) {
      contest.isRegistered = true
      contest.participantCount += 1
    }

    return HttpResponse.json({ id: 'reg-' + Date.now(), contestId, ...registration }, { status: 201 })
  }),

  // Update team registration
  http.put(url('/groups/:groupId/contests/:contestId/team-registrations/:teamId'), async ({ params, request }) => {
    await delay(300)
    const { contestId, teamId } = params as { groupId: string; contestId: string; teamId: string }
    const body = (await request.json()) as { selectedMembers: string[] }
    const team = mockTeamDetails[teamId]
    const existing = mockTeamRegistrations[contestId] || []
    const idx = existing.findIndex((r) => r.team.id === teamId)
    if (!team || idx === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Registro de equipo no encontrado' }, { status: 404 })
    }

    const updated = {
      team: { id: team.id, name: team.name },
      selectedMembers: body.selectedMembers.map((id) => {
        const member = team.members.find((m) => m.id === id)
        return { id, nickname: member?.nickname || id }
      }),
      registeredAt: existing[idx].registeredAt,
    }
    existing[idx] = updated
    mockTeamRegistrations[contestId] = existing

    return HttpResponse.json({ id: 'reg-updated', contestId, ...updated })
  }),

  // Unregister team from contest
  http.delete(url('/groups/:groupId/contests/:contestId/team-registrations/:teamId'), async ({ params }) => {
    await delay(200)
    const { contestId, teamId } = params as { groupId: string; contestId: string; teamId: string }
    const existing = mockTeamRegistrations[contestId] || []
    mockTeamRegistrations[contestId] = existing.filter((r) => r.team.id !== teamId)

    const contest = mockContests.find((c) => c.id === contestId)
    if (contest) {
      contest.isRegistered = false
      contest.participantCount = Math.max(0, contest.participantCount - 1)
    }

    return new HttpResponse(null, { status: 204 })
  }),
]
