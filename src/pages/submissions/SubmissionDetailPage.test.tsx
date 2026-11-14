import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockSubmissions } from '@/mocks/data'
import { SubmissionDetailPage } from './SubmissionDetailPage'

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

const COMPILATION_ERROR_ID = 'sub-005-aaaa-bbbb-cccc-ddddeeee0005'
const ACCEPTED_ID = 'sub-001-aaaa-bbbb-cccc-ddddeeee0001'

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
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('shows the compiler output of a submission that failed to compile', async () => {
    // Arrange
    renderPage(COMPILATION_ERROR_ID)

    // Assert
    expect(await screen.findByText('Salida del compilador')).toBeInTheDocument()
    expect(screen.getByTestId('compile-log')).toHaveTextContent("error: expected '}' at end of input")
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
    const failed = mockSubmissions.find((s) => s.id === COMPILATION_ERROR_ID)
    server.use(
      http.get('http://localhost:8080/api/submissions/:id', () =>
        HttpResponse.json({ ...failed, compileLog: null }),
      ),
    )
    renderPage(COMPILATION_ERROR_ID)

    // Assert
    expect(await screen.findByText('Código fuente')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Salida del compilador')).not.toBeInTheDocument())
  })
})
