import { http, HttpResponse, delay } from 'msw'
import { mockContests, buildContestList, mockStandings, mockContestSubmissions } from '../data'
import { url } from './utils'

export const contestsHandlers = [
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
  http.get(url('/groups/:groupId/contests/:contestId'), async ({ params }) => {
    await delay(200)
    const { contestId } = params as { groupId: string; contestId: string }
    const contest = mockContests.find((c) => c.id === contestId)
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
  http.get(url('/groups/:groupId/contests/:contestId/standings'), async ({ params }) => {
    await delay(300)
    const { contestId } = params as { groupId: string; contestId: string }
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
]
