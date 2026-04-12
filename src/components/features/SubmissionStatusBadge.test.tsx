import { render, screen } from '@testing-library/react'
import { SubmissionStatusBadge } from './SubmissionStatusBadge'
import type { SubmissionStatus } from '@/types'

const statusExpectations: { status: SubmissionStatus; label: string; color: 'success' | 'error' | 'warning' | 'default' }[] = [
  { status: 'ACCEPTED', label: 'Accepted', color: 'success' },
  { status: 'WRONG_ANSWER', label: 'Wrong Answer', color: 'error' },
  { status: 'TIME_LIMIT_EXCEEDED', label: 'Time Limit', color: 'warning' },
  { status: 'MEMORY_LIMIT_EXCEEDED', label: 'Memory Limit', color: 'warning' },
  { status: 'RUNTIME_EXCEPTION', label: 'Runtime Error', color: 'error' },
  { status: 'COMPILATION_ERROR', label: 'Compilation Error', color: 'error' },
  { status: 'PRESENTATION_ERROR', label: 'Presentation Error', color: 'warning' },
  { status: 'PENDING', label: 'Pending', color: 'default' },
  { status: 'RUNNING', label: 'Running', color: 'default' },
  { status: 'SYSTEM_ERROR', label: 'System Error', color: 'error' },
]

const dotColorClasses: Record<string, string> = {
  success: 'bg-status-success',
  error: 'bg-status-error',
  warning: 'bg-status-warning',
  default: 'bg-neutral-text-muted',
}

const textColorClasses: Record<string, string> = {
  success: 'text-status-success',
  error: 'text-status-error',
  warning: 'text-status-warning',
  default: 'text-neutral-text-muted',
}

describe('SubmissionStatusBadge', () => {
  describe('dot variant (default)', () => {
    it.each(statusExpectations)(
      'renders "$label" with correct style for $status',
      ({ status, label, color }) => {
        const { container } = render(<SubmissionStatusBadge status={status} />)

        expect(screen.getByText(label)).toBeInTheDocument()

        // Verify dot element has the correct color class
        const dot = container.querySelector('.rounded-full')
        expect(dot).toHaveClass(dotColorClasses[color])

        // Verify text element has the correct color class
        const textEl = screen.getByText(label)
        expect(textEl).toHaveClass(textColorClasses[color])
      },
    )
  })

  describe('badge variant', () => {
    it.each(statusExpectations)(
      'renders "$label" as a badge for $status',
      ({ status, label }) => {
        render(<SubmissionStatusBadge status={status} variant="badge" />)
        expect(screen.getByText(label)).toBeInTheDocument()
      },
    )
  })
})
