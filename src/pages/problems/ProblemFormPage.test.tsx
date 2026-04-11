import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { ProblemFormPage } from './ProblemFormPage'
import { ToastProvider } from '@/components/layout/ToastProvider'

/**
 * Helper: renders ProblemFormPage (create mode) wrapped with ToastProvider.
 * Sets localStorage auth token for ADMIN so MSW handlers resolve correctly.
 */
function renderCreateForm() {
  return renderWithProviders(
    <ToastProvider>
      <ProblemFormPage />
    </ToastProvider>,
    { role: 'ADMIN', initialRoute: '/problems/new' },
  )
}

describe('ProblemFormPage — form validation UX', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  // Requirement 6.1: submitting empty required fields shows error messages
  describe('empty required fields', () => {
    it('shows error messages for slug and title when submitting empty form', async () => {
      const user = userEvent.setup()
      renderCreateForm()

      // Wait for the form heading to render
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
      })

      // Click the submit button (the one with type="submit" text "Crear")
      const submitButton = screen.getByRole('button', { name: 'Crear' })
      await user.click(submitButton)

      // Slug and title are required — errors should appear
      await waitFor(() => {
        expect(screen.getByText('El slug debe tener al menos 3 caracteres')).toBeInTheDocument()
      })
      expect(screen.getByText('El título es requerido')).toBeInTheDocument()
    })
  })

  // Requirement 6.2: submitting values exceeding length constraints shows Zod error
  describe('length constraint violations', () => {
    it('shows error when title exceeds 200 characters', async () => {
      const user = userEvent.setup()
      renderCreateForm()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument()
      })

      const slugInput = screen.getByLabelText('Slug')
      const titleInput = screen.getByLabelText('Título')

      await user.type(slugInput, 'valid-slug')
      await user.type(titleInput, 'a'.repeat(201))

      const submitButton = screen.getByRole('button', { name: 'Crear' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('El título no puede exceder 200 caracteres')).toBeInTheDocument()
      })
    })

    it('shows error when slug exceeds 70 characters', async () => {
      const user = userEvent.setup()
      renderCreateForm()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument()
      })

      const slugInput = screen.getByLabelText('Slug')
      const titleInput = screen.getByLabelText('Título')

      // 71 chars of valid slug characters
      await user.type(slugInput, 'a'.repeat(71))
      await user.type(titleInput, 'Valid Title')

      const submitButton = screen.getByRole('button', { name: 'Crear' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('El slug no puede exceder 70 caracteres')).toBeInTheDocument()
      })
    })
  })

  // Requirement 6.3: correcting an invalid field and re-submitting clears the error
  describe('error clearing on correction', () => {
    it('clears slug error after correcting and re-submitting', async () => {
      const user = userEvent.setup()
      renderCreateForm()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument()
      })

      const slugInput = screen.getByLabelText('Slug')
      const titleInput = screen.getByLabelText('Título')

      // Submit empty to trigger errors
      const submitButton = screen.getByRole('button', { name: 'Crear' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('El slug debe tener al menos 3 caracteres')).toBeInTheDocument()
      })
      expect(screen.getByText('El título es requerido')).toBeInTheDocument()

      // Correct both fields
      await user.type(slugInput, 'valid-slug')
      await user.type(titleInput, 'Valid Title')

      // Re-submit
      await user.click(submitButton)

      // The slug and title errors should be cleared
      await waitFor(() => {
        expect(screen.queryByText('El slug debe tener al menos 3 caracteres')).not.toBeInTheDocument()
      })
      expect(screen.queryByText('El título es requerido')).not.toBeInTheDocument()
    })
  })

  // Requirement 6.4: displayed error messages match Zod schema messages
  describe('error messages match Zod schema', () => {
    it('displays the exact Zod slug regex error for invalid slug format', async () => {
      const user = userEvent.setup()
      renderCreateForm()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument()
      })

      const slugInput = screen.getByLabelText('Slug')
      const titleInput = screen.getByLabelText('Título')

      // Slug with uppercase letters (invalid per regex)
      await user.type(slugInput, 'INVALID')
      await user.type(titleInput, 'Valid Title')

      const submitButton = screen.getByRole('button', { name: 'Crear' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText('Solo letras minúsculas, números y guiones. No puede iniciar/terminar con guión.'),
        ).toBeInTheDocument()
      })
    })

    it('displays the exact Zod error for slug with consecutive hyphens', async () => {
      const user = userEvent.setup()
      renderCreateForm()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument()
      })

      const slugInput = screen.getByLabelText('Slug')
      const titleInput = screen.getByLabelText('Título')

      await user.type(slugInput, 'bad--slug')
      await user.type(titleInput, 'Valid Title')

      const submitButton = screen.getByRole('button', { name: 'Crear' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('No puede contener guiones consecutivos')).toBeInTheDocument()
      })
    })
  })
})


// Feature: frontend-testing, Property 6: Form displays Zod validation errors in UI
// **Validates: Requirements 6.1, 6.2, 6.4**

import fc from 'fast-check'
import { cleanup } from '@testing-library/react'
import { createProblemSchema } from '@/lib/schemas/problem'

/**
 * Arbitraries that generate invalid slug values violating different constraints.
 * Each returns a tuple of [invalidSlug, expectedZodErrorMessage].
 */

/** Slug too short: 1-2 chars of valid characters */
const arbSlugTooShort = fc
  .stringMatching(/^[a-z0-9]{1,2}$/)
  .map((s): [string, string] => [s, 'El slug debe tener al menos 3 caracteres'])

/** Slug with invalid characters (uppercase, spaces, special chars) */
const arbSlugInvalidChars = fc
  .stringMatching(/^[A-Z @!#]{3,10}$/)
  .map((s): [string, string] => [s, 'Solo letras minúsculas, números y guiones. No puede iniciar/terminar con guión.'])

/** Slug with consecutive hyphens */
const arbSlugConsecutiveHyphens = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{0,4}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{0,4}$/),
  )
  .map(([a, b]): [string, string] => [`${a}--${b}`, 'No puede contener guiones consecutivos'])

/** Title empty — triggers "requerido" */
const arbTitleEmpty = fc.constant('').map((): [string, string] => ['', 'El título es requerido'])

/** Title too long — exceeds 200 chars */
const arbTitleTooLong = fc
  .integer({ min: 201, max: 250 })
  .map((len): [string, string] => ['a'.repeat(len), 'El título no puede exceder 200 caracteres'])

/** Combined arbitrary: picks one invalid slug scenario */
const arbInvalidSlug = fc.oneof(arbSlugTooShort, arbSlugInvalidChars, arbSlugConsecutiveHyphens)

/** Combined arbitrary: picks one invalid title scenario */
const arbInvalidTitle = fc.oneof(arbTitleEmpty, arbTitleTooLong)

describe('ProblemFormPage — Property 6: Form displays Zod validation errors in UI', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  it('displays Zod slug validation errors in the UI for invalid slugs', { timeout: 60_000 }, async () => {
    await fc.assert(
      fc.asyncProperty(arbInvalidSlug, async ([invalidSlug, expectedError]) => {
        const user = userEvent.setup()
        const { unmount } = renderCreateForm()

        // Wait for form to render
        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
        })

        const slugInput = screen.getByLabelText('Slug')
        const titleInput = screen.getByLabelText('Título')

        // Fill slug with invalid value, title with valid value
        if (invalidSlug) {
          await user.type(slugInput, invalidSlug)
        }
        await user.type(titleInput, 'Valid Title')

        // Submit the form
        const submitButton = screen.getByRole('button', { name: 'Crear' })
        await user.click(submitButton)

        // Verify the exact Zod error message appears in the UI
        await waitFor(() => {
          expect(screen.getByText(expectedError)).toBeInTheDocument()
        })

        // Verify the error also matches what Zod would produce
        const zodResult = createProblemSchema.safeParse({ slug: invalidSlug, title: 'Valid Title' })
        expect(zodResult.success).toBe(false)

        // Cleanup DOM for next iteration
        unmount()
        cleanup()
      }),
      { numRuns: 10 },
    )
  })

  it('displays Zod title validation errors in the UI for invalid titles', { timeout: 60_000 }, async () => {
    await fc.assert(
      fc.asyncProperty(arbInvalidTitle, async ([invalidTitle, expectedError]) => {
        const user = userEvent.setup()
        const { unmount } = renderCreateForm()

        // Wait for form to render
        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
        })

        const slugInput = screen.getByLabelText('Slug')
        const titleInput = screen.getByLabelText('Título')

        // Fill slug with valid value, title with invalid value
        await user.type(slugInput, 'valid-slug')
        if (invalidTitle) {
          await user.type(titleInput, invalidTitle)
        }

        // Submit the form
        const submitButton = screen.getByRole('button', { name: 'Crear' })
        await user.click(submitButton)

        // Verify the exact Zod error message appears in the UI
        await waitFor(() => {
          expect(screen.getByText(expectedError)).toBeInTheDocument()
        })

        // Verify the error also matches what Zod would produce
        const zodResult = createProblemSchema.safeParse({ slug: 'valid-slug', title: invalidTitle })
        expect(zodResult.success).toBe(false)

        // Cleanup DOM for next iteration
        unmount()
        cleanup()
      }),
      { numRuns: 10 },
    )
  })
})


// Feature: frontend-testing, Property 7: Form error clearing on correction
// **Validates: Requirements 6.3**

describe('ProblemFormPage — Property 7: Form error clearing on correction', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  /**
   * Arbitrary: valid slug (3–20 chars, lowercase alphanumeric + single hyphens, no leading/trailing hyphen).
   * Kept short to avoid slow typing in userEvent.
   */
  const arbValidSlug = fc
    .tuple(
      fc.stringMatching(/^[a-z][a-z0-9]{1,8}$/),
      fc.stringMatching(/^[a-z][a-z0-9]{1,8}$/),
    )
    .map(([a, b]) => `${a}-${b}`)

  /**
   * Arbitrary: valid title (1–50 chars of printable text).
   * Kept short to avoid slow typing.
   */
  const arbValidTitle = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,30}$/)

  it('clears slug and title errors after correcting with valid values and re-submitting', { timeout: 120_000 }, async () => {
    await fc.assert(
      fc.asyncProperty(arbValidSlug, arbValidTitle, async (validSlug, validTitle) => {
        const user = userEvent.setup()
        const { unmount } = renderCreateForm()

        // Wait for form to render
        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
        })

        const slugInput = screen.getByLabelText('Slug')
        const titleInput = screen.getByLabelText('Título')
        const submitButton = screen.getByRole('button', { name: 'Crear' })

        // Step 1: Submit empty form to trigger validation errors
        await user.click(submitButton)

        await waitFor(() => {
          expect(screen.getByText('El slug debe tener al menos 3 caracteres')).toBeInTheDocument()
        })
        expect(screen.getByText('El título es requerido')).toBeInTheDocument()

        // Step 2: Correct both fields with valid generated values
        await user.type(slugInput, validSlug)
        await user.type(titleInput, validTitle)

        // Step 3: Re-submit
        await user.click(submitButton)

        // Step 4: Verify errors are cleared
        await waitFor(() => {
          expect(screen.queryByText('El slug debe tener al menos 3 caracteres')).not.toBeInTheDocument()
        })
        expect(screen.queryByText('El título es requerido')).not.toBeInTheDocument()

        // Cleanup for next iteration
        unmount()
        cleanup()
      }),
      { numRuns: 5 },
    )
  })
})
