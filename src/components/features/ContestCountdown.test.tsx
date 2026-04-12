import { render, screen } from '@testing-library/react'
import fc from 'fast-check'
import { ContestCountdown } from './ContestCountdown'

/**
 * Helper: builds an ISO target time string that is `ms` milliseconds from now.
 */
function futureTarget(ms: number): string {
  return new Date(Date.now() + ms).toISOString()
}

describe('ContestCountdown', () => {
  // ── Task 9.4 — Unit tests ────────────────────────────────────────────

  describe('displays remaining time for a future end time', () => {
    it('renders hours, minutes and seconds for a target ~1 h 30 min away', () => {
      const ms = (1 * 3600 + 30 * 60 + 15) * 1000 // 1h 30m 15s
      render(<ContestCountdown targetTime={futureTarget(ms)} />)

      // The default variant renders a formatted string like "01:30:15"
      const countdown = screen.getByText(/\d{2}:\d{2}:\d{2}/)
      expect(countdown).toBeInTheDocument()
    })

    it('includes days prefix when target is more than 24 h away', () => {
      const ms = (2 * 86400 + 3600) * 1000 // 2 days + 1 hour
      render(<ContestCountdown targetTime={futureTarget(ms)} />)

      // Should contain "2d" prefix
      expect(screen.getByText(/2d\s/)).toBeInTheDocument()
    })

    it('renders the optional label when provided', () => {
      render(
        <ContestCountdown
          targetTime={futureTarget(60_000)}
          label="Tiempo restante"
        />,
      )
      expect(screen.getByText('Tiempo restante')).toBeInTheDocument()
    })
  })

  describe('edge case: exactly 0 seconds remaining', () => {
    it('displays 00:00:00 when target time is in the past', () => {
      const pastTarget = new Date(Date.now() - 1000).toISOString()
      render(<ContestCountdown targetTime={pastTarget} />)

      expect(screen.getByText('00:00:00')).toBeInTheDocument()
    })
  })

  // ── Task 9.5 — Property test ─────────────────────────────────────────
  // Feature: frontend-testing, Property 12: Countdown displays valid remaining time
  // **Validates: Requirements 9.3**

  describe('Property 12: Countdown displays valid remaining time', () => {
    it('displays non-negative remaining time for any future target date', () => {
      fc.assert(
        fc.property(
          // Generate a future offset between 1 second and ~365 days (in ms)
          fc.integer({ min: 1_000, max: 365 * 24 * 3600 * 1000 }),
          (offsetMs) => {
            const target = futureTarget(offsetMs)
            const { unmount } = render(<ContestCountdown targetTime={target} />)

            // The default variant renders a single <p> with the formatted time.
            // It should match either "HH:MM:SS" or "Xd HH:MM:SS".
            const el = screen.getByText(/(\d+d\s)?\d{2}:\d{2}:\d{2}/)
            expect(el).toBeInTheDocument()

            // Verify the text does NOT contain a minus sign (non-negative)
            expect(el.textContent).not.toMatch(/-/)

            unmount()
          },
        ),
        { numRuns: 50 },
      )
    })
  })
})
