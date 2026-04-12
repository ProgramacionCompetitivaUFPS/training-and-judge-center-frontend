import { render, screen } from '@testing-library/react'
import { ContestStatusBadge } from './ContestStatusBadge'
import { CONTEST_STATUS_CONFIG } from '@/lib/constants'
import type { ContestStatus } from '@/types/contest'

const statuses: { status: ContestStatus; label: string; variant: string }[] = [
  { status: 'SCHEDULED', label: 'Programado', variant: 'default' },
  { status: 'ACTIVE', label: 'En curso', variant: 'success' },
  { status: 'FINISHED', label: 'Finalizado', variant: 'outline' },
]

const variantClasses: Record<string, string> = {
  default: 'bg-neutral-border',
  success: 'bg-status-success/10',
  outline: 'border-neutral-border',
}

describe('ContestStatusBadge', () => {
  it.each(statuses)(
    'renders "$label" with $variant style for $status',
    ({ status, label, variant }) => {
      render(<ContestStatusBadge status={status} />)

      const badge = screen.getByText(label)
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass(variantClasses[variant])
    },
  )

  it('renders labels matching CONTEST_STATUS_CONFIG', () => {
    for (const [status, config] of Object.entries(CONTEST_STATUS_CONFIG)) {
      const { unmount } = render(
        <ContestStatusBadge status={status as ContestStatus} />,
      )
      expect(screen.getByText(config.label)).toBeInTheDocument()
      unmount()
    }
  })
})
