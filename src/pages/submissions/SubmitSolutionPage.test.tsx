import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { SubmitSolutionPage } from './SubmitSolutionPage'

// Mock heavy external components that don't work in jsdom
vi.mock('@/components/features/BlocklyEditor', () => ({
  default: (_props: unknown) => <div data-testid="blockly-editor" />,
}))

vi.mock('@/components/features/CodeEditor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="code-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

vi.mock('@/components/features/blockly/PyodideRunner', () => ({
  PyodideRunner: () => null,
}))

vi.mock('@/hooks/useSubmissionRecovery', () => ({
  useSubmissionRecovery: () => ({ savedCode: null, savedLanguage: null, clearSaved: vi.fn() }),
}))

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

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

function renderPage() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/submit']}>
        <SubmitSolutionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SubmitSolutionPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders problem search and language selector', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders submit button', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument()
    })
  })

})
