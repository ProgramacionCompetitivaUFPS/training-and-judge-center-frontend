import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import type { SubmissionDetail } from '@/types/submission'
import { SubmissionDetailPage } from './SubmissionDetailPage'

const mockLogout = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: () => true,
    lastNickname: mockCurrentUser.nickname,
    logout: mockLogout,
  }),
}))

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

const COMPILATION_ERROR_ID = 'sub-005-aaaa-bbbb-cccc-ddddeeee0005'
const ACCEPTED_ID = 'sub-001-aaaa-bbbb-cccc-ddddeeee0001'

const failedWithoutLog: SubmissionDetail = {
  id: COMPILATION_ERROR_ID,
  status: 'COMPILATION_ERROR',
  visibility: 'PRIVATE',
  submittedAt: '2026-03-10T09:15:00Z',
  judgedAt: '2026-03-10T09:15:01Z',
  problem: { slug: 'dynamic-knapsack', title: 'Dynamic Knapsack' },
  contest: null,
  submittedBy: { id: 'user-luisadmin', nickname: 'luisadmin' },
  language: 'cpp20',
  compiler: 'g++',
  executionTime: null,
  memoryKb: null,
  compileLog: null,
  sourceCode: 'int main() {',
  isBlocklySubmission: false,
  workspaceXml: null,
}

function renderPage(id: string) {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/submissions/${id}`]}>
        <Routes>
          <Route path="/submissions/:id" element={<SubmissionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SubmissionDetailPage compiler output', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('shows the compiler output of a submission that failed to compile', async () => {
    // Arrange
    renderPage(COMPILATION_ERROR_ID)

    // Assert
    expect(await screen.findByText('Salida del compilador')).toBeInTheDocument()
    expect(screen.getByText(/error: expected '}' at end of input/)).toBeInTheDocument()
  })

  it('does not show the compiler output card for a submission without a log', async () => {
    // Arrange
    renderPage(ACCEPTED_ID)

    // Assert: wait for the detail to render, then check the card is absent
    expect(await screen.findByText('Código fuente')).toBeInTheDocument()
    expect(screen.queryByText('Salida del compilador')).not.toBeInTheDocument()
  })

  it('does not show the card when a failed submission has no stored log', async () => {
    // Arrange
    server.use(
      http.get('http://localhost:8080/api/submissions/:id', () =>
        HttpResponse.json(failedWithoutLog),
      ),
    )
    renderPage(COMPILATION_ERROR_ID)

    // Assert
    expect(await screen.findByText('Código fuente')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Salida del compilador')).not.toBeInTheDocument())
  })
})
