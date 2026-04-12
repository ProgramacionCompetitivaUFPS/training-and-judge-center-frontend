import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { renderWithProviders, screen, waitFor, server } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { cleanup } from '@testing-library/react'
import fc from 'fast-check'
import { ProblemFormPage } from './ProblemFormPage'
import { ToastProvider } from '@/components/layout/ToastProvider'

const API_URL = 'http://localhost:8080/api'

/**
 * Helper: renders ProblemFormPage (create mode) wrapped with ToastProvider.
 */
function renderCreateForm() {
  return renderWithProviders(
    <ToastProvider>
      <ProblemFormPage />
    </ToastProvider>,
    { role: 'ADMIN', initialRoute: '/problems/new' },
  )
}

/**
 * Helper: fills the form with valid data (slug, title, timeLimit, memoryLimit)
 * so that Zod validation passes and the mutation fires.
 */
async function fillFormWithValidData(
  user: ReturnType<typeof userEvent.setup>,
  slug: string,
  title: string,
) {
  const slugInput = screen.getByLabelText('Slug')
  const titleInput = screen.getByLabelText('Título')
  const timeLimitInput = screen.getByLabelText('Tiempo límite (ms)')
  const memoryLimitInput = screen.getByLabelText('Memoria límite (MiB)')

  await user.type(slugInput, slug)
  await user.type(titleInput, title)
  await user.type(timeLimitInput, '2000')
  await user.type(memoryLimitInput, '256')
}

describe('ProblemFormPage — submit button disabled state', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')

    // Override POST /problems with infinite delay to keep submission state visible
    server.use(
      http.post(`${API_URL}/problems`, async () => {
        await delay('infinite')
        return HttpResponse.json({}, { status: 201 })
      }),
    )
  })

  // Requirement 10.2: submit button disabled during submission
  // Requirement 10.4: submit button shows loading indicator during submission
  it('disables the submit button and shows loading spinner during form submission', async () => {
    const user = userEvent.setup()
    renderCreateForm()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
    })

    await fillFormWithValidData(user, 'test-submit-slug', 'Test Submit Title')

    // Click submit — the mutation fires and isPending becomes true
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    // The button should be disabled while submission is in progress
    await waitFor(() => {
      const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement
      expect(submitBtn).toBeDisabled()
    })

    // The Button component renders an SVG spinner when isLoading is true
    const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement
    const spinner = submitBtn.querySelector('svg.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})

// Feature: frontend-testing, Property 14: Submit button disabled during submission
// **Validates: Requirements 10.2, 10.4**

describe('ProblemFormPage — Property 14: Submit button disabled during submission', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  /**
   * Arbitrary: valid slug (3–15 chars, lowercase alphanumeric with single hyphens).
   */
  const arbValidSlug = fc
    .tuple(
      fc.stringMatching(/^[a-z][a-z0-9]{1,5}$/),
      fc.stringMatching(/^[a-z][a-z0-9]{1,5}$/),
    )
    .map(([a, b]) => `${a}-${b}`)

  /**
   * Arbitrary: valid title (1–50 chars of printable text).
   */
  const arbValidTitle = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,30}$/)

  it('submit button is disabled and shows spinner during submission for any valid form data', { timeout: 120_000 }, async () => {
    let callCount = 0

    await fc.assert(
      fc.asyncProperty(arbValidSlug, arbValidTitle, async (slug, title) => {
        callCount++
        const uniqueSlug = `${slug}-p${callCount}`

        // Override POST /problems with infinite delay to keep pending state
        server.use(
          http.post(`${API_URL}/problems`, async () => {
            await delay('infinite')
            return HttpResponse.json({}, { status: 201 })
          }),
        )

        const user = userEvent.setup()
        const { unmount } = renderCreateForm()

        // Wait for form to render
        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
        })

        // Fill form with generated valid data + required number fields
        await fillFormWithValidData(user, uniqueSlug, title)

        // Submit the form
        await user.click(screen.getByRole('button', { name: 'Crear' }))

        // Verify button is disabled during submission
        await waitFor(() => {
          const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement
          expect(submitBtn).toBeDisabled()
        })

        // Verify loading spinner is present
        const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement
        const spinner = submitBtn.querySelector('svg.animate-spin')
        expect(spinner).toBeTruthy()

        // Cleanup for next iteration
        unmount()
        cleanup()
      }),
      { numRuns: 3 },
    )
  })
})
