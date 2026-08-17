import { http, HttpResponse, delay } from 'msw'
import { mockContests, buildContestList, buildRegistrations, computeContestStatus, mockStandings, mockContestSubmissions, mockProblems, mockTeamRegistrations, mockGroupDetails } from '../data'
import { url } from './utils'

export const contestsHandlers = [
  // List all contests accessible to the user (across all groups)
  http.get(url('/contests'), async ({ request }) => {
    await delay(300)
    const sp = new URL(request.url).searchParams
    let filtered = mockContests.map((c) => ({ ...c, status: computeContestStatus(c.startTime, c.endTime) }))

    const status = sp.get('status') || undefined
    if (status) filtered = filtered.filter((c) => c.status === status)

    const search = sp.get('search') || undefined
    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(s))
    }

    const page = Number(sp.get('page')) || 1
    const limit = Number(sp.get('limit')) || 20
    const start = (page - 1) * limit
    const paged = filtered.slice(start, start + limit)

    return HttpResponse.json({
      data: paged,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
        hasNextPage: start + limit < filtered.length,
        hasPrevPage: page > 1,
      },
    })
  }),

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
      search: sp.get('search') || undefined,
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
    const group = mockGroupDetails[groupId]
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
      participationMode: (body.participationMode as 'INDIVIDUAL' | 'TEAM' | 'MIXED') || 'INDIVIDUAL',
      teamSizeMin: body.teamSizeMin as number | undefined,
      teamSizeMax: body.teamSizeMax as number | undefined,
      showTeamMembers: (body.showTeamMembers as boolean) || false,
      group: { id: groupId, name: group?.name || 'Mock Group' },
      owner: { id: 'u1', nickname: 'luisadmin' },
      problems: [],
      problemCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockContests.push(newContest)
    return HttpResponse.json(newContest, { status: 201 })
  }),

  // Update contest
  http.put(url('/groups/:groupId/contests/:contestId'), async ({ params, request }) => {
    await delay(300)
    const { contestId } = params as { groupId: string; contestId: string }
    const idx = mockContests.findIndex((c) => c.id === contestId)
    if (idx === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Contest no encontrado' }, { status: 404 })
    }
    const contest = mockContests[idx]
    const body = (await request.json()) as Record<string, unknown> & {
      problems?: Array<{ slug: string; order: number }>
    }

    const changesTeamShape = 'participationMode' in body || 'teamSizeMin' in body || 'teamSizeMax' in body
    const hasTeamRegistrations = (mockTeamRegistrations[contestId] || []).length > 0
    if (changesTeamShape && hasTeamRegistrations) {
      return HttpResponse.json({
        error: 'CONTEST_HAS_TEAM_REGISTRATIONS',
        message: 'No se puede cambiar la modalidad o el tamaño de equipo: ya hay equipos registrados en esta competencia',
      }, { status: 409 })
    }

    const resolvedProblems = body.problems
      ? body.problems
        .map((p) => {
          const problem = mockProblems.find((mp) => mp.slug === p.slug)
          if (!problem) return null
          return {
            position: p.order,
            slug: problem.slug,
            title: problem.title,
            timeLimit: problem.timeLimit ?? 1000,
            memoryLimit: problem.memoryLimit ?? 256,
          }
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .sort((a, b) => a.position - b.position)
      : contest.problems

    const updated = {
      ...contest,
      ...body,
      problems: resolvedProblems,
      problemCount: resolvedProblems.length,
      updatedAt: new Date().toISOString(),
    }
    mockContests[idx] = updated
    return HttpResponse.json(updated)
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
  http.get(url('/groups/:groupId/contests/:contestId/registrations'), async ({ request }) => {
    await delay(200)
    const sp = new URL(request.url).searchParams
    const result = buildRegistrations({
      page: Number(sp.get('page')) || 1,
      limit: Number(sp.get('limit')) || 50,
      search: sp.get('search') || undefined,
    })
    return HttpResponse.json(result)
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

  // Rejudge all submissions of a problem within a contest
  http.post(url('/groups/:groupId/contests/:contestId/problems/:problemSlug/rejudge'), async ({ params }) => {
    await delay(400)
    const { contestId } = params as { groupId: string; contestId: string; problemSlug: string }
    const contest = mockContests.find((c) => c.id === contestId)
    if (!contest) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Contest no encontrado' }, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
