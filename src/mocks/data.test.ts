import { describe, it, expect } from 'vitest'
import { buildProblemSubmissionsList } from './data'

// two-sum has 3 submissions:
//   sub-001-…0001  luisadmin  PRIVATE  ACCEPTED    cpp20       (not blockly)
//   sub-006-…0006  carloscp   PUBLIC   ACCEPTED    python310   (not blockly)
//   sub-009-…0009  luisadmin  PRIVATE  WRONG_ANSWER python310  (blockly)

const SLUG = 'two-sum'

describe('buildProblemSubmissionsList', () => {
  describe('visibility rules', () => {
    it('returns only PUBLIC submissions when no params given', () => {
      const { submissions, pagination } = buildProblemSubmissionsList({ problemSlug: SLUG })
      expect(submissions.length).toBe(1)
      expect(submissions[0].submittedBy.nickname).toBe('carloscp')
      expect(pagination.total).toBe(1)
    })

    it('returns only own submissions when mine=true + userNickname', () => {
      const { submissions, pagination } = buildProblemSubmissionsList({
        problemSlug: SLUG,
        mine: true,
        userNickname: 'luisadmin',
      })
      expect(submissions.length).toBe(2)
      expect(submissions.every((s) => s.submittedBy.nickname === 'luisadmin')).toBe(true)
      expect(pagination.total).toBe(2)
    })

    it('returns own + PUBLIC of others when only userNickname given', () => {
      const { submissions, pagination } = buildProblemSubmissionsList({
        problemSlug: SLUG,
        userNickname: 'luisadmin',
      })
      expect(submissions.length).toBe(3)
      expect(pagination.total).toBe(3)
      const nicks = submissions.map((s) => s.submittedBy.nickname)
      expect(nicks).toContain('luisadmin')
      expect(nicks).toContain('carloscp')
    })

    it('excludes PRIVATE submissions of other users when userNickname given', () => {
      const { submissions } = buildProblemSubmissionsList({
        problemSlug: SLUG,
        userNickname: 'carloscp',
      })
      const luisPrivate = submissions.filter((s) => s.submittedBy.nickname === 'luisadmin')
      expect(luisPrivate.length).toBe(0)
    })

    it('returns empty list when mine=true but no userNickname', () => {
      const { submissions, pagination } = buildProblemSubmissionsList({ problemSlug: SLUG, mine: true })
      expect(submissions).toEqual([])
      expect(pagination.total).toBe(0)
    })

    it('returns empty list for unknown problemSlug', () => {
      const { submissions, pagination } = buildProblemSubmissionsList({ problemSlug: 'no-existe' })
      expect(submissions).toEqual([])
      expect(pagination.total).toBe(0)
    })
  })

  describe('deduplication', () => {
    it('returns no duplicate IDs when userNickname is given', () => {
      const { submissions } = buildProblemSubmissionsList({ problemSlug: SLUG, userNickname: 'luisadmin' })
      const ids = submissions.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('filters', () => {
    it('filters PUBLIC submissions by verdict', () => {
      const { submissions } = buildProblemSubmissionsList({ problemSlug: SLUG, verdict: 'ACCEPTED' })
      expect(submissions.length).toBe(1)
      expect(submissions.every((s) => s.status === 'ACCEPTED')).toBe(true)
    })

    it('returns empty when verdict matches no PUBLIC submission', () => {
      const { submissions } = buildProblemSubmissionsList({ problemSlug: SLUG, verdict: 'WRONG_ANSWER' })
      expect(submissions).toEqual([])
    })

    it('filters PUBLIC submissions by language', () => {
      const { submissions } = buildProblemSubmissionsList({ problemSlug: SLUG, language: 'python310' })
      // sub-006 (carloscp, python310, PUBLIC, not blockly) should match
      expect(submissions.length).toBe(1)
      expect(submissions[0].submittedBy.nickname).toBe('carloscp')
    })

    it('filters by blockly language (selects blockly submissions only)', () => {
      // sub-009 is a blockly submission from luisadmin — only visible with userNickname
      const { submissions } = buildProblemSubmissionsList({
        problemSlug: SLUG,
        userNickname: 'luisadmin',
        language: 'blockly',
      })
      expect(submissions.length).toBe(1)
      expect(submissions[0].submittedBy.nickname).toBe('luisadmin')
    })
  })

  describe('pagination', () => {
    it('respects page and limit', () => {
      const page1 = buildProblemSubmissionsList({
        problemSlug: SLUG,
        userNickname: 'luisadmin',
        page: 1,
        limit: 2,
      })
      expect(page1.submissions.length).toBe(2)
      expect(page1.pagination.hasNextPage).toBe(true)
      expect(page1.pagination.hasPrevPage).toBe(false)
      expect(page1.pagination.total).toBe(3)
      expect(page1.pagination.totalPages).toBe(2)

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
})
