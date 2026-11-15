import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockGroupDetails, mockMaterialMat001 } from '@/mocks/data'
import type { User } from '@/types/user'
import { MaterialDetailPage } from './MaterialDetailPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

// Mutable so individual tests can switch to a different role
let _authUser: User = { ...mockCurrentUser }

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: _authUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: (role: string | string[]) => {
      const roles = Array.isArray(role) ? role : [role]
      return roles.includes(_authUser.role)
    },
    lastNickname: _authUser.nickname,
    logout: vi.fn(),
  }),
}))

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

function renderPage(groupId = 'group-1', materialId = 'mat-001') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/materials/${materialId}`]}>
        <Routes>
          <Route path="/groups/:groupId/materials/:materialId" element={<MaterialDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MaterialDetailPage', () => {
  beforeEach(() => {
    _authUser = { ...mockCurrentUser }
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders material title and author', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: /bienvenidos al grupo de entrenamiento/i })).toBeInTheDocument()
    expect(screen.getByText('@mariacoach')).toBeInTheDocument()
  })

  it('shows edit actions dropdown for ADMIN', async () => {
    renderPage()
    await screen.findByRole('heading', { name: /bienvenidos al grupo de entrenamiento/i })
    expect(screen.getByRole('button', { name: /acciones del material/i })).toBeInTheDocument()
  })

  it('renders not-found page on 404', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/materials/:materialId', () =>
        HttpResponse.json({ error: 'MATERIAL_NOT_FOUND' }, { status: 404 }),
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
    })
  })

  it('renders error page on 500', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/materials/:materialId', () =>
        HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    })
  })

  it('CONTESTANT (non-author, non-lead) does not see actions dropdown', async () => {
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
    // Override group to return MEMBER role so isRealLead=false (default mock returns LEAD)
    server.use(
      http.get('http://localhost:8080/api/groups/group-1', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-1'],
          userMembership: { isMember: true, role: 'MEMBER', joinedAt: '2024-09-01T12:00:00Z' },
        }),
      ),
    )
    renderPage()
    await screen.findByRole('heading', { name: /bienvenidos al grupo de entrenamiento/i })
    expect(screen.queryByRole('button', { name: /acciones del material/i })).not.toBeInTheDocument()
  })

  it('CONTESTANT does not see the DRAFT status badge', async () => {
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
    // Use DRAFT material with publishedAt=null so the sidebar "Publicado" row is also hidden
    const draftMaterial = {
      ...mockMaterialMat001,
      status: 'DRAFT' as const,
      publishedAt: null,
    }
    server.use(
      http.get('http://localhost:8080/api/groups/group-1/materials/mat-001', () =>
        HttpResponse.json(draftMaterial),
      ),
      http.get('http://localhost:8080/api/groups/group-1', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-1'],
          userMembership: { isMember: true, role: 'MEMBER', joinedAt: '2024-09-01T12:00:00Z' },
        }),
      ),
    )
    renderPage()
    await screen.findByRole('heading', { name: /bienvenidos al grupo de entrenamiento/i })
    // canSeeStatus=false for CONTESTANT: status badge ("Borrador") must be hidden
    expect(screen.queryByText('Borrador')).not.toBeInTheDocument()
  })

  it('ADMIN sees "Borrador" badge for a DRAFT material', async () => {
    const draftMaterial = { ...mockMaterialMat001, status: 'DRAFT' as const }
    server.use(
      http.get('http://localhost:8080/api/groups/group-1/materials/mat-001', () =>
        HttpResponse.json(draftMaterial),
      ),
    )
    renderPage()
    await screen.findByRole('heading', { name: /bienvenidos al grupo de entrenamiento/i })
    expect(screen.getByText('Borrador')).toBeInTheDocument()
  })
})
