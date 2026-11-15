import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { MaterialsPage } from './MaterialsPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: (role: string) => mockCurrentUser.role === role || mockCurrentUser.role === 'ADMIN',
    lastNickname: mockCurrentUser.nickname,
    logout: vi.fn(),
  }),
}))

function renderPage(groupId = 'group-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/materials`]}>
        <Routes>
          <Route path="/groups/:groupId/materials" element={<MaterialsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MaterialsPage', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it('renders material list', async () => {
    renderPage()
    expect(await screen.findByText('Bienvenidos al grupo de entrenamiento')).toBeInTheDocument()
  })

  it('shows create button for ADMIN', async () => {
    renderPage()
    await screen.findByText('Bienvenidos al grupo de entrenamiento')
    expect(screen.getByRole('button', { name: /nuevo material/i })).toBeInTheDocument()
  })

  it('shows empty state when no materials', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/materials', () =>
        HttpResponse.json({ materials: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
      ),
    )
    renderPage()
    await screen.findByText('No se encontraron materiales')
    expect(screen.queryByText('Bienvenidos al grupo de entrenamiento')).not.toBeInTheDocument()
  })
})
