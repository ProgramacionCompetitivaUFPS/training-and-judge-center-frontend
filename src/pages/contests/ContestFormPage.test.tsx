import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { ContestFormPage } from './ContestFormPage'

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

function renderCreate(groupId = 'group-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/contests/new`]}>
        <Routes>
          <Route path="/groups/:groupId/contests/new" element={<ContestFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderEdit(groupId = 'group-1', contestId = 'contest-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/contests/${contestId}/edit`]}>
        <Routes>
          <Route path="/groups/:groupId/contests/:id/edit" element={<ContestFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ContestFormPage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders name field and submit button in create mode', async () => {
    renderCreate()
    expect(await screen.findByRole('textbox', { name: /nombre/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /crear|guardar/i })).toBeInTheDocument()
  })

  it('pre-fills name in edit mode', async () => {
    renderEdit()
    expect(await screen.findByDisplayValue('Competencia Semanal #12')).toBeInTheDocument()
  })

  it('shows validation error on empty name submit', async () => {
    const user = userEvent.setup()
    renderCreate()
    await user.click(await screen.findByRole('button', { name: /crear|guardar/i }))
    expect(await screen.findByText('El nombre es requerido')).toBeInTheDocument()
  })

  it('shows success toast after creating a contest', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.type(await screen.findByRole('textbox', { name: /nombre/i }), 'Mi Competencia Test')

    // datetime-local: userEvent v14 does not support these inputs reliably (§13b exception)
    // fireEvent.change is used intentionally here
    fireEvent.change(screen.getByLabelText(/fecha y hora de inicio/i), {
      target: { value: '2027-06-01T10:00' },
    })
    fireEvent.change(screen.getByLabelText(/fecha y hora de fin/i), {
      target: { value: '2027-06-01T12:00' },
    })

    await user.click(screen.getByRole('button', { name: /crear|guardar/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Creado' }))
    })
  })
})
