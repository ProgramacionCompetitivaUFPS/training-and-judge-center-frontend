import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockProblemTwoSum } from '@/mocks/data'
import { ProblemFormPage } from './ProblemFormPage'

// scrollIntoView not in jsdom (used by TagPicker)
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: () => true,
    lastNickname: mockCurrentUser.nickname,
    logout: vi.fn(),
  }),
}))

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

function renderCreate() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/problems/new']}>
        <Routes>
          <Route path="/problems/new" element={<ProblemFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderEdit(slug = 'two-sum') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/problems/${slug}/edit`]}>
        <Routes>
          <Route path="/problems/:slug/edit" element={<ProblemFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProblemFormPage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders title field and tag picker in create mode', () => {
    renderCreate()
    expect(screen.getByRole('textbox', { name: /título/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /agregar un tag/i })).toBeInTheDocument()
  })

  it('pre-fills title in edit mode', async () => {
    const draftProblem = { ...mockProblemTwoSum, status: 'DRAFT' as const }
    server.use(
      http.get('http://localhost:8080/api/problems/p/two-sum', () =>
        HttpResponse.json(draftProblem),
      ),
    )
    renderEdit()
    expect(await screen.findByDisplayValue('Two Sum')).toBeInTheDocument()
  })

  it('shows validation error on empty submit', async () => {
    const user = userEvent.setup()
    renderCreate()
    const submitButton = screen.getByRole('button', { name: /crear|guardar/i })
    await user.click(submitButton)
    expect(await screen.findByText('El slug debe tener al menos 3 caracteres')).toBeInTheDocument()
    expect(screen.getByText('El título es requerido')).toBeInTheDocument()
  })

  it('allows adding a tag from the picker', async () => {
    const user = userEvent.setup()
    renderCreate()
    const tagInput = screen.getByRole('combobox', { name: /agregar un tag/i })
    await user.click(tagInput)
    await user.type(tagInput, 'arrays')
    const option = await screen.findByRole('option', { name: 'arrays' })
    await user.click(option)
    expect(await screen.findByRole('button', { name: /quitar el tag arrays/i })).toBeInTheDocument()
  })

  it('allows removing an added tag', async () => {
    const user = userEvent.setup()
    renderCreate()

    // Add "arrays" tag
    const tagInput = screen.getByRole('combobox', { name: /agregar un tag/i })
    await user.click(tagInput)
    await user.type(tagInput, 'arrays')
    await user.click(await screen.findByRole('option', { name: 'arrays' }))

    // Remove it
    const removeBtn = await screen.findByRole('button', { name: /quitar el tag arrays/i })
    await user.click(removeBtn)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /quitar el tag arrays/i })).not.toBeInTheDocument()
    })
  })
})
