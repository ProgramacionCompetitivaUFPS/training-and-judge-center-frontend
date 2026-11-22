import { http, HttpResponse } from 'msw'

import { mockProblemTwoSum } from '@/mocks/data'
import { API, ANA } from './authBackend'
import { server } from './server'

const VERDICTS = ['PENDING', 'RUNNING', 'ACCEPTED'] as const

/**
 * Judge for problem "two-sum": POST creates a submission; every later read of the list moves it one step
 * along PENDING → RUNNING → ACCEPTED, so a page that polls sees the verdict arrive. `rejectWith` makes the
 * POST fail instead.
 */
export function installSubmissionBackend(options: { rejectWith?: { status: number; code: string } } = {}) {
  const state = { submissionId: null as string | null, listReadsSinceSubmit: 0, listReads: 0, posts: 0 }

  const currentVerdict = () => VERDICTS[Math.min(state.listReadsSinceSubmit - 1, VERDICTS.length - 1)]

  server.use(
    http.get(`${API}/problems/p/two-sum`, () => HttpResponse.json(mockProblemTwoSum)),
    http.get(`${API}/users/me/submissions`, () => {
      state.listReads += 1
      const submissions = []
      if (state.submissionId) {
        state.listReadsSinceSubmit += 1
        submissions.push({
          id: state.submissionId,
          status: currentVerdict(),
          visibility: 'PRIVATE',
          submittedAt: new Date().toISOString(),
          problem: { slug: 'two-sum', title: mockProblemTwoSum.title },
          contest: null,
          submittedBy: { id: ANA.id, nickname: ANA.nickname },
          language: 'cpp20',
          isBlocklySubmission: false,
          executionTime: null,
          memoryKb: null,
        })
      }
      return HttpResponse.json({
        submissions,
        pagination: { page: 1, limit: 5, total: submissions.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      })
    }),
    http.post(`${API}/problems/p/two-sum/submissions`, () => {
      state.posts += 1
      if (options.rejectWith) {
        return HttpResponse.json({ error: options.rejectWith.code, message: 'rechazado' }, { status: options.rejectWith.status })
      }
      state.submissionId = 'sub-new-0001-aaaa-bbbb'
      return HttpResponse.json(
        {
          id: state.submissionId,
          status: 'PENDING',
          submittedAt: new Date().toISOString(),
          problem: { slug: 'two-sum', title: mockProblemTwoSum.title },
          language: 'cpp20',
        },
        { status: 201 },
      )
    }),
  )

  return state
}
