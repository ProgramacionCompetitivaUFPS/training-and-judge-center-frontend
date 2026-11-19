import { http, HttpResponse, delay } from 'msw'
import { mockContests, buildContestList, buildRegistrations, buildContestSubmissionsList, computeContestStatus, mockStandings, mockPostStandings, mockFrozenStandings, mockLargeStandings, mockProblems, mockTeamRegistrations, mockGroupDetails, mockGroupMembers, mockUsers } from '../data'
import { isValidBalloonColor } from '@/lib/balloon'
import { url } from './utils'
import type { StandingProblemResult } from '@/types/contest'

/** Cuenta como intento visible: ni NOT_ATTEMPTED ni una celda pendiente sin fallos anteriores al freeze. */
function countsAsTried(cell: StandingProblemResult): boolean {
  if (cell.status === 'NOT_ATTEMPTED') return false
  return !(cell.status === 'PENDING' && cell.attempts === 0)
}

/** Filas de standings del mock: oficiales y, si la competencia terminó con post-competencia, las de post. */
function standingsRowsFor(contest: (typeof mockContests)[number]) {
  const officialRows = contest.id === 'contest-6' ? mockFrozenStandings : contest.id === 'contest-7' ? mockLargeStandings : mockStandings
  const postAvailable = computeContestStatus(contest.startTime, contest.endTime) === 'FINISHED' && contest.enablePostContest
  const postRows = postAvailable && contest.id === 'contest-8' ? mockPostStandings : []
  return { officialRows, postRows }
}

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

    const sortBy = sp.get('sortBy') || 'startTime'
    const order = sp.get('order') === 'asc' ? 'asc' : 'desc'
    const sortKey = sortBy === 'name' ? 'name' : sortBy === 'createdAt' ? 'createdAt' : 'startTime'
    filtered = [...filtered].sort((a, b) => {
      const cmp = String(a[sortKey as keyof typeof a]).localeCompare(String(b[sortKey as keyof typeof b]))
      return order === 'asc' ? cmp : -cmp
    })

    const page = Number(sp.get('page')) || 1
    const limit = Number(sp.get('limit')) || 20
    const start = (page - 1) * limit
    const paged = filtered.slice(start, start + limit)

    return HttpResponse.json({
      items: paged,
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
      sortOrder: sp.get('order') || undefined,
    })
    return HttpResponse.json(result)
  }),

  // Contest detail
  http.get(url('/groups/:groupId/contests/:contestId'), async ({ params }) => {
    await delay(200)
    const { contestId } = params as { groupId: string; contestId: string }
    const contest = mockContests.find((c) => c.id === contestId)
    if (!contest) {
      return HttpResponse.json({ error: 'CONTEST_NOT_FOUND', message: 'Competencia no encontrada' }, { status: 404 })
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
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Competencia no encontrada' }, { status: 404 })
    }
    const contest = mockContests[idx]
    const body = (await request.json()) as Record<string, unknown> & {
      problems?: Array<{ slug: string; order: number; color?: string | null }>
    }

    const changesTeamShape = 'participationMode' in body || 'teamSizeMin' in body || 'teamSizeMax' in body
    const hasTeamRegistrations = (mockTeamRegistrations[contestId] || []).length > 0
    if (changesTeamShape && hasTeamRegistrations) {
      return HttpResponse.json({
        error: 'CONTEST_HAS_TEAM_REGISTRATIONS',
        message: 'No se puede cambiar la modalidad o el tamaño de equipo: ya hay equipos registrados en esta competencia',
      }, { status: 409 })
    }

    if (body.problems && computeContestStatus(contest.startTime, contest.endTime) === 'FINISHED') {
      return HttpResponse.json({
        error: 'CONTEST_PROBLEMS_LOCKED',
        message: 'No se pueden cambiar los problemas de una competencia finalizada',
      }, { status: 409 })
    }
    if (body.problems?.some((p) => p.color !== undefined && p.color !== null && !isValidBalloonColor(p.color))) {
      return HttpResponse.json({ error: 'INVALID_PROBLEM_COLOR', message: 'Color inválido' }, { status: 400 })
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
            color: p.color !== undefined
              ? (p.color === null ? null : p.color.toLowerCase())
              : (contest.problems.find((cp) => cp.slug === p.slug)?.color ?? null),
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
    const contest = mockContests.find((c) => c.id === contestId)
    if (!contest) {
      return HttpResponse.json({ error: 'CONTEST_NOT_FOUND', message: 'Competencia no encontrada' }, { status: 404 })
    }
    if (contest.locked === true) {
      return HttpResponse.json({ error: 'CONTEST_LOCKED', message: 'Competencia bloqueada' }, { status: 403 })
    }
    if (computeContestStatus(contest.startTime, contest.endTime) === 'ACTIVE') {
      return HttpResponse.json({ error: 'CONTEST_IS_ACTIVE', message: 'Competencia en curso' }, { status: 409 })
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
  http.get(url('/groups/:groupId/contests/:contestId/standings'), async ({ params, request }) => {
    await delay(300)
    const { contestId } = params as { groupId: string; contestId: string }
    const contest = mockContests.find((c) => c.id === contestId)
    if (!contest) {
      return HttpResponse.json({ error: 'CONTEST_NOT_FOUND', message: 'Competencia no encontrada' }, { status: 404 })
    }

    const sp = new URL(request.url).searchParams
    const page = Number(sp.get('page')) || 1
    const limit = Number(sp.get('limit')) || 50
    const country = sp.get('country')?.toLowerCase() || undefined
    const city = sp.get('city')?.toLowerCase() || undefined
    const institution = sp.get('institution')?.toLowerCase() || undefined

    const phase = sp.get('phase') ?? 'all'
    if (phase !== 'competition' && phase !== 'postcompetition' && phase !== 'all') {
      return HttpResponse.json(
        { error: 'BAD_REQUEST', message: "phase must be 'competition', 'postcompetition' or 'all'" },
        { status: 400 },
      )
    }

    const { officialRows, postRows } = standingsRowsFor(contest)
    const base =
      phase === 'competition' ? officialRows : phase === 'postcompetition' ? postRows : [...officialRows, ...postRows]
    // Contadores de la fase pedida: con postcompetition, sobre las filas de post (sin filtros).
    const countRows = phase === 'postcompetition' ? postRows : officialRows
    const endMs = Date.parse(contest.endTime)
    const freezeStartMs = contest.freezeMinutes != null ? endMs - contest.freezeMinutes * 60_000 : null
    const isFrozen =
      computeContestStatus(contest.startTime, contest.endTime) === 'ACTIVE' && freezeStartMs !== null && Date.now() >= freezeStartMs

    const filtered = base.filter((entry) => {
      const p = entry.participant
      if (country && !p.country?.toLowerCase().includes(country)) return false
      if (city && !p.city?.toLowerCase().includes(city)) return false
      if (institution && !p.institution?.toLowerCase().includes(institution)) return false
      return true
    })

    const totalPages = Math.max(1, Math.ceil(filtered.length / limit))
    const start = (page - 1) * limit
    const paged = filtered.slice(start, start + limit)

    return HttpResponse.json({
      contest: {
        id: contest.id,
        name: contest.name,
        status: contest.status,
        startTime: contest.startTime,
        endTime: contest.endTime,
        penalty: contest.penalty,
        freezeMinutes: contest.freezeMinutes,
        isFrozen,
        frozenAt: isFrozen && freezeStartMs !== null ? new Date(freezeStartMs).toISOString() : null,
      },
      problems: contest.problems.map((p) => ({
        position: p.position,
        slug: p.slug,
        title: p.title,
        color: p.color ?? null,
        // Contadores globales: no dependen de filtros ni de la página.
        accepted: countRows.filter((e) => e.problems.some((r) => r.position === p.position && r.status === 'ACCEPTED')).length,
        tried: countRows.filter((e) => e.problems.some((r) => r.position === p.position && countsAsTried(r))).length,
        // Contadores de post-competencia: siempre presentes, 0 si no hay filas de post.
        postAccepted: postRows.filter((e) => e.problems.some((r) => r.position === p.position && r.status === 'ACCEPTED')).length,
        postTried: postRows.filter((e) => e.problems.some((r) => r.position === p.position && countsAsTried(r))).length,
      })),
      standings: paged.map((entry) => ({
        ...entry,
        // Una celda por problema de la competencia, aunque la fila tenga menos resultados.
        problems: contest.problems.map((p) => {
          const cell = entry.problems.find((r) => r.position === p.position)
          return cell
            ? { ...cell, pending: cell.pending ?? 0 }
            : { position: p.position, status: 'NOT_ATTEMPTED' as const, attempts: 0, time: null, penalty: 0, pending: 0 }
        }),
      })),
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: { country: country || null, city: city || null, institution: institution || null, filteredTotal: filtered.length },
    })
  }),

  // Standings filter options — distinct values across this contest's own participants,
  // same shape/intent as GET /admin/users/filters.
  http.get(url('/groups/:groupId/contests/:contestId/standings/filters'), async ({ params }) => {
    await delay(150)
    const { contestId } = params as { groupId: string; contestId: string }
    const contest = mockContests.find((c) => c.id === contestId)
    if (!contest) {
      return HttpResponse.json({ error: 'CONTEST_NOT_FOUND', message: 'Competencia no encontrada' }, { status: 404 })
    }

    const distinct = (values: Array<string | null | undefined>) =>
      [...new Set(values.filter((v): v is string => !!v))].sort()

    // Los filtros aplican a las dos secciones, así que las opciones salen de oficiales y post.
    const { officialRows, postRows } = standingsRowsFor(contest)
    const participants = [...officialRows, ...postRows].map((e) => e.participant)

    return HttpResponse.json({
      countries: distinct(participants.map((p) => p.country)),
      cities: distinct(participants.map((p) => p.city)),
      institutions: distinct(participants.map((p) => p.institution)),
    })
  }),

  // Contest submissions — Leads/Admins are exempt from freeze masking (list_contest_submissions.go).
  http.get(url('/groups/:groupId/contests/:contestId/submissions'), async ({ params, request }) => {
    await delay(300)
    const { contestId } = params as { groupId: string; contestId: string }
    const contest = mockContests.find((c) => c.id === contestId)
    if (!contest) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Competencia no encontrada' }, { status: 404 })
    }

    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const viewerNickname = token.replace('mock-jwt-token-', '')
    const viewer = mockUsers.find((u) => u.nickname === viewerNickname)
    const isRealLead = (mockGroupMembers[contest.group.id] || []).some(
      (m) => m.nickname === viewerNickname && m.role === 'LEAD',
    )
    const isPrivileged = viewer?.role === 'ADMIN' || isRealLead

    const sp = new URL(request.url).searchParams
    const result = buildContestSubmissionsList({
      contestId,
      page: Number(sp.get('page')) || 1,
      limit: Number(sp.get('limit')) || 50,
      phase: sp.get('phase') || undefined,
      problemSlug: sp.get('problemSlug') || undefined,
      nickname: sp.get('nickname') || undefined,
      isPrivileged,
      viewerNickname,
    })
    if (!result) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Competencia no encontrada' }, { status: 404 })
    }
    return HttpResponse.json(result)
  }),

  // Rejudge all submissions of a problem within a contest
  http.post(url('/groups/:groupId/contests/:contestId/problems/:problemSlug/rejudge'), async ({ params }) => {
    await delay(400)
    const { contestId } = params as { groupId: string; contestId: string; problemSlug: string }
    const contest = mockContests.find((c) => c.id === contestId)
    if (!contest) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Competencia no encontrada' }, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
