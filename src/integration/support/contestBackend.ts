import { http, HttpResponse } from 'msw'

import { mockContests, mockGroupDetails } from '@/mocks/data'
import type { StandingsResponse } from '@/types/contest'
import { API } from './authBackend'
import { server } from './server'

// Fixtures come from src/mocks/data (explicit reuse); the endpoints below are written for these tests.

const GROUP_ID = 'group-1'
const CONTEST_ID = 'contest-9'

const PROBLEMS = [
  { position: 1, slug: 'two-sum', title: 'Two Sum' },
  { position: 2, slug: 'binary-search', title: 'Binary Search' },
]

function standings(revealed: boolean): StandingsResponse {
  const contest = mockContests.find((c) => c.id === CONTEST_ID)!
  return {
    contest: {
      id: CONTEST_ID,
      name: contest.name,
      status: 'FINISHED',
      startTime: contest.startTime,
      endTime: contest.endTime,
      penalty: 20,
      freezeMinutes: 60,
      // Until the organizers reveal the results the table is the frozen one the participants see
      isFrozen: !revealed,
      frozenAt: revealed ? null : contest.endTime,
      resultsRevealedAt: revealed ? contest.endTime : null,
      autoRevealAt: null,
    },
    problems: PROBLEMS,
    standings: [
      {
        rank: 1,
        participant: { id: 'p-ana', type: 'INDIVIDUAL', displayName: 'Ana Pérez', nickname: 'ana' },
        problemsSolved: revealed ? 2 : 1,
        totalPenalty: revealed ? 150 : 40,
        problems: revealed
          ? [
              // accepted on the third try: two failed attempts before the AC
              { position: 1, status: 'ACCEPTED', attempts: 2, time: 40, penalty: 80 },
              { position: 2, status: 'ACCEPTED', attempts: 0, time: 70, penalty: 70 },
            ]
          : [
              { position: 1, status: 'ACCEPTED', attempts: 0, time: 40, penalty: 40 },
              { position: 2, status: 'PENDING', attempts: 0, time: null, penalty: 0, pending: 2 },
            ],
      },
      {
        rank: 2,
        participant: { id: 'p-beto', type: 'INDIVIDUAL', displayName: 'Beto Ruiz', nickname: 'beto' },
        problemsSolved: 0,
        totalPenalty: 0,
        problems: [
          { position: 1, status: 'WRONG_ANSWER', attempts: 3, time: null, penalty: 0 },
          { position: 2, status: 'NOT_ATTEMPTED', attempts: 0, time: null, penalty: 0 },
        ],
      },
    ],
    pagination: { page: 1, limit: 10, total: 2, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    filters: { country: null, city: null, institution: null, filteredTotal: 2 },
  }
}

/**
 * A finished, frozen contest whose results get revealed by POST .../reveal-results: after that call the
 * standings and the contest answer with the final table. `memberRole` is the signed-in person's role in the group.
 */
export function installFrozenContestBackend(memberRole: 'LEAD' | 'MEMBER') {
  const state = { revealed: false, revealCalls: 0 }
  const contest = mockContests.find((c) => c.id === CONTEST_ID)!
  const contestUrl = `${API}/groups/${GROUP_ID}/contests/${CONTEST_ID}`

  server.use(
    http.get(`${API}/groups/${GROUP_ID}`, () =>
      HttpResponse.json({
        ...mockGroupDetails[GROUP_ID],
        userMembership: { isMember: true, role: memberRole, joinedAt: '2024-06-01T10:00:00Z' },
      }),
    ),
    http.get(contestUrl, () =>
      HttpResponse.json({ ...contest, status: 'FINISHED', resultsRevealedAt: state.revealed ? contest.endTime : null }),
    ),
    http.get(`${contestUrl}/standings`, () => HttpResponse.json(standings(state.revealed))),
    http.get(`${contestUrl}/standings/filters`, () => HttpResponse.json({ countries: [], cities: [], institutions: [] })),
    http.post(`${contestUrl}/reveal-results`, () => {
      state.revealCalls += 1
      state.revealed = true
      return new HttpResponse(null, { status: 204 })
    }),
  )

  return { state, standingsUrl: `/groups/${GROUP_ID}/contests/${CONTEST_ID}/standings` }
}
