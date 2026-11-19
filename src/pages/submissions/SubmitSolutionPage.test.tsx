import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
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

function renderPage(path = '/submit') {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
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
    localStorage.clear()
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

describe('SubmitSolutionPage remembers the last language', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
    localStorage.clear()
  })
  afterEach(() => clearAccessToken())

  // The file input is hidden (a button opens it), so it has no accessible role or label to query by.
  async function uploadPythonSolution(container: HTMLElement) {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File(['print(1)'], 'solution.py', { type: 'text/plain' }))
  }

  it('starts with the language of the last solution sent, and its template', async () => {
    // Arrange
    localStorage.setItem('last-submission-language', 'java17')

    // Act
    renderPage()

    // Assert
    expect(screen.getByRole('combobox', { name: 'Lenguaje' })).toHaveTextContent('Java 17')
    const editor = (await screen.findByTestId('code-editor')) as HTMLTextAreaElement
    expect(editor.value).toContain('public class Solution')
  })

  it('starts with no language when nothing was sent before', async () => {
    // Act
    renderPage()

    // Assert
    expect(screen.getByRole('combobox', { name: 'Lenguaje' })).toHaveTextContent('Seleccionar lenguaje')
  })

  it('ignores a remembered language that is no longer supported', async () => {
    // Arrange
    localStorage.setItem('last-submission-language', 'cobol')

    // Act
    renderPage()

    // Assert
    expect(screen.getByRole('combobox', { name: 'Lenguaje' })).toHaveTextContent('Seleccionar lenguaje')
  })

  it('remembers the language once the solution was sent', async () => {
    // Arrange: nothing remembered; the .py extension picks Python
    const { container } = renderPage('/submit?problem=two-sum')
    await uploadPythonSolution(container)
    await waitFor(() => expect((screen.getByTestId('code-editor') as HTMLTextAreaElement).value).toBe('print(1)'))

    // Act
    await user.click(screen.getByRole('button', { name: /enviar solución/i }))

    // Assert
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success', title: 'Solución enviada' })),
    )
    expect(localStorage.getItem('last-submission-language')).toBe('python310')
  })

  it('does not remember the language when the submission fails', async () => {
    // Arrange
    server.use(
      http.post('http://localhost:8080/api/problems/p/:slug/submissions', () =>
        HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
      ),
    )
    const { container } = renderPage('/submit?problem=two-sum')
    await uploadPythonSolution(container)
    await waitFor(() => expect((screen.getByTestId('code-editor') as HTMLTextAreaElement).value).toBe('print(1)'))

    // Act
    await user.click(screen.getByRole('button', { name: /enviar solución/i }))

    // Assert
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'No se pudo enviar la solución' })),
    )
    expect(localStorage.getItem('last-submission-language')).toBeNull()
  })
})
