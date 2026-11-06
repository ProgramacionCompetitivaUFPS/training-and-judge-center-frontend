import { describe, it, expect } from 'vitest'
import { buildProblemSubmissionsList } from './data'

// two-sum has 3 submissions:
//   sub-001-…0001  luisadmin  PRIVATE  ACCEPTED
//   sub-006-…0006  carloscp   PUBLIC   ACCEPTED
//   sub-009-…0009  luisadmin  PRIVATE  WRONG_ANSWER

const SLUG = 'two-sum'

describe('buildProblemSubmissionsList', () => {
  it('returns only PUBLIC submissions when no params given', () => {
    const { submissions } = buildProblemSubmissionsList({ problemSlug: SLUG })
    expect(submissions.length).toBe(1)
    expect(submissions[0].submittedBy.nickname).toBe('carloscp')
  })

  it('returns only own submissions when mine=true + userNickname', () => {
    const { submissions } = buildProblemSubmissionsList({
      problemSlug: SLUG,
      mine: true,
      userNickname: 'luisadmin',
    })
    expect(submissions.length).toBe(2)
    expect(submissions.every((s) => s.submittedBy.nickname === 'luisadmin')).toBe(true)
  })

  it('returns own + PUBLIC of others when only userNickname given', () => {
    const { submissions } = buildProblemSubmissionsList({
      problemSlug: SLUG,
      userNickname: 'luisadmin',
    })
    expect(submissions.length).toBe(3)
    const nicks = submissions.map((s) => s.submittedBy.nickname)
    expect(nicks).toContain('luisadmin')
    expect(nicks).toContain('carloscp')
  })

  it('excludes PRIVATE submissions of other users when userNickname given', () => {
    const { submissions } = buildProblemSubmissionsList({
      problemSlug: SLUG,
      userNickname: 'carloscp',
    })
    // carloscp has 1 own PUBLIC + luisadmin has 0 PUBLIC → total 1
    const luisPrivate = submissions.filter(
      (s) => s.submittedBy.nickname === 'luisadmin',
    )
    expect(luisPrivate.length).toBe(0)
  })

  it('returns empty list when mine=true but no userNickname', () => {
    const { submissions } = buildProblemSubmissionsList({
      problemSlug: SLUG,
      mine: true,
    })
    expect(submissions).toEqual([])
  })

  it('returns no duplicate IDs when userNickname is given', () => {
    const { submissions } = buildProblemSubmissionsList({
      problemSlug: SLUG,
      userNickname: 'luisadmin',
    })
    const ids = submissions.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('respects page and limit for pagination', () => {
    const page1 = buildProblemSubmissionsList({
      problemSlug: SLUG,
      userNickname: 'luisadmin',
      page: 1,
      limit: 2,
    })
    expect(page1.submissions.length).toBe(2)
    expect(page1.pagination.hasNextPage).toBe(true)
    expect(page1.pagination.hasPrevPage).toBe(false)

    const page2 = buildProblemSubmissionsList({
      problemSlug: SLUG,
      userNickname: 'luisadmin',
      page: 2,
      limit: 2,
    })
    expect(page2.submissions.length).toBe(1)
    expect(page2.pagination.hasNextPage).toBe(false)
    expect(page2.pagination.hasPrevPage).toBe(true)
  })
})
