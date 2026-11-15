import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { ProblemFilePage } from './ProblemFilePage'

vi.mock('@/components/features/CodeBlockViewer', () => ({
  default: ({ value }: { value: string }) => <pre data-testid="code-viewer">{value}</pre>,
}))

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

function renderPage(slug = 'two-sum', fileType = 'solution', fileName = 'solution.cpp') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/problems/${slug}/files/${fileType}/${fileName}`]}>
        <Routes>
          <Route path="/problems/:slug/files/solution/:fileName" element={<ProblemFilePage />} />
          <Route path="/problems/:slug/files/:fileType" element={<ProblemFilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProblemFilePage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders file content after loading', async () => {
    renderPage()
    const viewer = await screen.findByTestId('code-viewer')
    expect(viewer).toBeInTheDocument()
    expect(viewer.textContent).toBeTruthy()
  })

  it('renders breadcrumb with problem title', async () => {
    renderPage()
    expect(await screen.findByText('Two Sum')).toBeInTheDocument()
  })
})
