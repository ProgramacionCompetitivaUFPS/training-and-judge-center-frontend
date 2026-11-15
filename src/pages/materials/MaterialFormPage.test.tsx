import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { MaterialFormPage } from './MaterialFormPage'

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
      <MemoryRouter initialEntries={[`/groups/${groupId}/materials/new`]}>
        <Routes>
          <Route path="/groups/:groupId/materials/new" element={<MaterialFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderEdit(groupId = 'group-1', materialId = 'mat-001') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/materials/${materialId}/edit`]}>
        <Routes>
          <Route path="/groups/:groupId/materials/:materialId/edit" element={<MaterialFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MaterialFormPage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders title field and submit button in create mode', async () => {
    renderCreate()
    expect(await screen.findByRole('textbox', { name: /título/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /publicar/i })).toBeInTheDocument()
  })

  it('pre-fills title in edit mode', async () => {
    renderEdit()
    expect(await screen.findByDisplayValue('Bienvenidos al grupo de entrenamiento')).toBeInTheDocument()
  })

  it('shows validation error on empty title submit', async () => {
    const user = userEvent.setup()
    renderCreate()
    await user.click(await screen.findByRole('button', { name: /publicar/i }))
    const matches = await screen.findAllByText(/título/i)
    expect(matches.length).toBeGreaterThan(1)
  })

  it('shows success toast after creating a material', async () => {
    server.use(
      http.post('http://localhost:8080/api/groups/:groupId/materials/:materialId/publish', () =>
        HttpResponse.json({ id: 'mat-new', status: 'PUBLISHED', publishedAt: new Date().toISOString() }),
      ),
    )
    const user = userEvent.setup()
    renderCreate()
    await user.type(await screen.findByRole('textbox', { name: /título/i }), 'Material de Prueba')
    await user.click(await screen.findByRole('button', { name: /publicar/i }))
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' }),
      )
    })
  })
})
