// Feature: frontend-testing, Property 11: Status badge label correctness
// **Validates: Requirements 9.1, 9.2**

import { render, screen } from '@testing-library/react'
import fc from 'fast-check'
import { SubmissionStatusBadge } from './SubmissionStatusBadge'
import { ContestStatusBadge } from './ContestStatusBadge'
import { CONTEST_STATUS_CONFIG } from '@/lib/constants'
import type { SubmissionStatus } from '@/types'
import type { ContestStatus } from '@/types/contest'

/**
 * The SubmissionStatusBadge component uses its own internal statusConfig.
 * These expected labels mirror that internal config so the property test
 * validates what the component actually renders.
 */
const SUBMISSION_EXPECTED_LABELS: Record<SubmissionStatus, string> = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  TIME_LIMIT_EXCEEDED: 'Time Limit',
  MEMORY_LIMIT_EXCEEDED: 'Memory Limit',
  RUNTIME_EXCEPTION: 'Runtime Error',
  COMPILATION_ERROR: 'Compilation Error',
  PRESENTATION_ERROR: 'Presentation Error',
  PENDING: 'Pending',
  RUNNING: 'Running',
  SYSTEM_ERROR: 'System Error',
}

const allSubmissionStatuses = Object.keys(SUBMISSION_EXPECTED_LABELS) as SubmissionStatus[]
const allContestStatuses = Object.keys(CONTEST_STATUS_CONFIG) as ContestStatus[]

describe('Property 11: Status badge label correctness', () => {
  it('SubmissionStatusBadge renders the matching label for every status', () => {
    fc.assert(
      fc.property(fc.constantFrom(...allSubmissionStatuses), (status) => {
        const { unmount } = render(<SubmissionStatusBadge status={status} />)
        const expectedLabel = SUBMISSION_EXPECTED_LABELS[status]
        const element = screen.getByText(expectedLabel)
        expect(element).toBeInTheDocument()
        unmount()
      }),
      { numRuns: allSubmissionStatuses.length },
    )
  })

  it('ContestStatusBadge renders the matching label for every status', () => {
    fc.assert(
      fc.property(fc.constantFrom(...allContestStatuses), (status) => {
        const { unmount } = render(<ContestStatusBadge status={status} />)
        const expectedLabel = CONTEST_STATUS_CONFIG[status].label
        const element = screen.getByText(expectedLabel)
        expect(element).toBeInTheDocument()
        unmount()
      }),
      { numRuns: allContestStatuses.length },
    )
  })
})
