import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { ProblemTestCasePage } from './ProblemTestCasePage'

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

function renderPage(slug = 'two-sum', kind = 'sample', name = '1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/problems/${slug}/files/test-cases/${kind}/${name}`]}>
        <Routes>
          <Route path="/problems/:slug/files/test-cases/:kind/:name" element={<ProblemTestCasePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProblemTestCasePage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders test case content', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByTestId('code-viewer')).toHaveLength(2)
    })
  })

  it('renders breadcrumb with problem title', async () => {
    renderPage()
    expect(await screen.findByText('Two Sum')).toBeInTheDocument()
  })
})
