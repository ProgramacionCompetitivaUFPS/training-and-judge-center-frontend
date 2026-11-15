import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { GroupFormPage } from './GroupFormPage'

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
      <MemoryRouter initialEntries={['/groups/new']}>
        <Routes>
          <Route path="/groups/new" element={<GroupFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderEdit(groupId = 'group-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/edit`]}>
        <Routes>
          <Route path="/groups/:id/edit" element={<GroupFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GroupFormPage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders empty form in create mode', () => {
    renderCreate()
    expect(screen.getByRole('textbox', { name: /nombre/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear grupo/i })).toBeInTheDocument()
  })

  it('pre-fills name in edit mode', async () => {
    renderEdit()
    expect(await screen.findByDisplayValue('ICPC Colombia')).toBeInTheDocument()
  })

  it('shows validation error on empty name submit', async () => {
    const user = userEvent.setup()
    renderCreate()
    await user.click(screen.getByRole('button', { name: /crear grupo/i }))
    expect(await screen.findByText('El nombre es requerido')).toBeInTheDocument()
  })

  it('shows success toast after creating a group', async () => {
    const user = userEvent.setup()
    renderCreate()
    await user.type(screen.getByRole('textbox', { name: /nombre/i }), 'Mi Nuevo Grupo')
    await user.click(screen.getByRole('button', { name: /crear grupo/i }))
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' }),
      )
    })
  })
})
