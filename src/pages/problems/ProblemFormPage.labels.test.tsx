import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { ProblemFormPage } from './ProblemFormPage'
import { ContestFormPage } from '@/pages/contests/ContestFormPage'
import { ToastProvider } from '@/components/layout/ToastProvider'
import fc from 'fast-check'
import { cleanup } from '@testing-library/react'

// ============================================================
// Task 12.4: Form label association tests
// Requirement 11.4: Form inputs have associated labels
// ============================================================

/** Expected labeled inputs in ProblemFormPage (create mode) */
const PROBLEM_FORM_LABELS = [
  'Slug',
  'Título',
  'Contenido (Markdown + LaTeX)',
  'Tiempo límite (ms)',
  'Memoria límite (MiB)',
]

/** Expected labeled inputs in ContestFormPage (create mode) */
const CONTEST_FORM_LABELS = [
  'Nombre',
  'Descripción',
  'Fecha y hora de inicio',
  'Fecha y hora de fin',
  'Penalización (minutos)',
  'Freeze (minutos antes del fin)',
]

function renderProblemCreateForm() {
  return renderWithProviders(
    <ToastProvider>
      <ProblemFormPage />
    </ToastProvider>,
    { role: 'ADMIN', initialRoute: '/problems/new' },
  )
}

function renderContestCreateForm() {
  return renderWithProviders(<ContestFormPage />, {
    role: 'ADMIN',
    initialRoute: '/groups/group-1/contests/new',
  })
}

describe('Form label association — Requirement 11.4', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  describe('ProblemFormPage', () => {
    it.each(PROBLEM_FORM_LABELS)(
      'input "%s" is findable via its associated label',
      async (labelText) => {
        renderProblemCreateForm()

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
        })

        // getByLabelText verifies the label is associated via for/id or aria-labelledby
        const input = screen.getByLabelText(labelText)
        expect(input).toBeInTheDocument()
        expect(input.tagName).toMatch(/^(INPUT|TEXTAREA|SELECT)$/i)
      },
    )

    it('every text input and textarea has an associated visible label', async () => {
      renderProblemCreateForm()

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Crear problema' })).toBeInTheDocument()
      })

      // Query all visible labels that use htmlFor
      const labels = document.querySelectorAll('label[for]')
      expect(labels.length).toBeGreaterThan(0)

      labels.forEach((label) => {
        const forAttr = label.getAttribute('for')!
        const associatedInput = document.getElementById(forAttr)
        expect(associatedInput).not.toBeNull()
        // Label should have visible text
        expect(label.textContent?.trim().length).toBeGreaterThan(0)
      })
    })
  })

  describe('ContestFormPage', () => {
    it.each(CONTEST_FORM_LABELS)(
      'input "%s" is findable via its associated label',
      async (labelText) => {
        renderContestCreateForm()

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'Nueva competencia' })).toBeInTheDocument()
        })

        const input = screen.getByLabelText(labelText)
        expect(input).toBeInTheDocument()
        expect(input.tagName).toMatch(/^(INPUT|TEXTAREA|SELECT)$/i)
      },
    )

    it('every text input and textarea has an associated visible label', async () => {
      renderContestCreateForm()

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Nueva competencia' })).toBeInTheDocument()
      })

      const labels = document.querySelectorAll('label[for]')
      expect(labels.length).toBeGreaterThan(0)

      labels.forEach((label) => {
        const forAttr = label.getAttribute('for')!
        const associatedInput = document.getElementById(forAttr)
        expect(associatedInput).not.toBeNull()
        expect(label.textContent?.trim().length).toBeGreaterThan(0)
      })
    })
  })
})

// ============================================================
// Task 12.5: Property 16 — Form inputs have associated labels
// Feature: frontend-testing, Property 16: Form inputs have associated labels
// **Validates: Requirements 11.4**
// ============================================================

interface FormPageConfig {
  name: string
  render: () => ReturnType<typeof renderWithProviders>
  headingText: string
  expectedLabels: string[]
}

const FORM_PAGES: FormPageConfig[] = [
  {
    name: 'ProblemFormPage',
    render: renderProblemCreateForm,
    headingText: 'Crear problema',
    expectedLabels: PROBLEM_FORM_LABELS,
  },
  {
    name: 'ContestFormPage',
    render: renderContestCreateForm,
    headingText: 'Nueva competencia',
    expectedLabels: CONTEST_FORM_LABELS,
  },
]

describe('Property 16: Form inputs have associated labels', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-luisadmin')
  })

  it('for all form pages and their inputs, a visible label is associated', { timeout: 30_000 }, async () => {
    // Arbitrary: pick a form page, then pick a label from that page
    const arbFormAndLabel = fc
      .integer({ min: 0, max: FORM_PAGES.length - 1 })
      .chain((pageIdx) => {
        const page = FORM_PAGES[pageIdx]
        return fc
          .integer({ min: 0, max: page.expectedLabels.length - 1 })
          .map((labelIdx) => ({
            page,
            labelText: page.expectedLabels[labelIdx],
          }))
      })

    await fc.assert(
      fc.asyncProperty(arbFormAndLabel, async ({ page, labelText }) => {
        const { unmount } = page.render()

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: page.headingText })).toBeInTheDocument()
        })

        // Property: every form input has a visible associated label
        const input = screen.getByLabelText(labelText)
        expect(input).toBeInTheDocument()

        // The input must be a form control element
        const tagName = input.tagName.toUpperCase()
        expect(['INPUT', 'TEXTAREA', 'SELECT']).toContain(tagName)

        // The label must be visible (not hidden)
        const inputId = input.getAttribute('id')
        expect(inputId).toBeTruthy()

        const label = document.querySelector(`label[for="${inputId}"]`)
        expect(label).not.toBeNull()
        expect(label!.textContent?.trim().length).toBeGreaterThan(0)

        unmount()
        cleanup()
      }),
      { numRuns: 20 },
    )
  })
})
