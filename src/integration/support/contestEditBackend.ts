import { http, HttpResponse } from 'msw'

import { mockContests, mockGroupDetails } from '@/mocks/data'
import { API } from './authBackend'
import { server } from './server'

const GROUP_ID = 'group-1'
const CONTEST_ID = 'contest-1'

/**
 * A scheduled contest that someone else edits while this person has the form open: the first PUT answers
 * 409 CONTEST_CONFLICT, and by then the server already holds the other person's new description.
 */
export function installContestEditBackend() {
  const original = mockContests.find((c) => c.id === CONTEST_ID)!
  const state = {
    description: original.description,
    putBodies: [] as Array<Record<string, unknown>>,
    contestReads: 0,
  }
  const contestUrl = `${API}/groups/${GROUP_ID}/contests/${CONTEST_ID}`

  server.use(
    http.get(`${API}/groups/${GROUP_ID}`, () =>
      HttpResponse.json({
        ...mockGroupDetails[GROUP_ID],
        userMembership: { isMember: true, role: 'LEAD', joinedAt: '2024-06-01T10:00:00Z' },
      }),
    ),
    http.get(contestUrl, () => {
      state.contestReads += 1
      return HttpResponse.json({ ...original, description: state.description })
    }),
    http.put(contestUrl, async ({ request }) => {
      state.putBodies.push((await request.json()) as Record<string, unknown>)
      // The other person saved first
      state.description = 'Descripción escrita por otra persona'
      return HttpResponse.json(
        { error: 'CONTEST_CONFLICT', message: 'La competencia fue modificada' },
        { status: 409 },
      )
    }),
  )

  return { state, editUrl: `/groups/${GROUP_ID}/contests/${CONTEST_ID}/edit`, originalName: original.name, originalDescription: original.description }
}
