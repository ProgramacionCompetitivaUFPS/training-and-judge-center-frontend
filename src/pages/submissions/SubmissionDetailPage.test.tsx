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

// Blockly needs a real SVG layout engine: the viewer is replaced by a marker that shows which workspace it got
vi.mock('@/components/features/BlocklyWorkspaceViewer', () => ({
  default: ({ workspaceXml }: { workspaceXml: string }) => <div data-testid="blockly-viewer">{workspaceXml}</div>,
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

describe('SubmissionDetailPage problem link', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  function serveDetail(contest: unknown) {
    server.use(
      http.get('http://localhost:8080/api/submissions/:id', () =>
        HttpResponse.json({ ...failedWithoutLog, contest }),
      ),
    )
  }

  it("links to the problem through the contest's own route when the submission belongs to a contest", async () => {
    // Arrange
    serveDetail({ id: 'contest-1', name: 'Copa', groupId: 'group-1', problemPosition: 2 })
    renderPage(COMPILATION_ERROR_ID)

    // Assert: position 2 is problem B
    const link = await screen.findByRole('link', { name: 'Dynamic Knapsack' })
    expect(link).toHaveAttribute('href', '/groups/group-1/contests/contest-1/problems/B')
  })

  it('falls back to the general problem page when the problem was dropped from the contest', async () => {
    // Arrange
    serveDetail({ id: 'contest-1', name: 'Copa', groupId: 'group-1', problemPosition: null })
    renderPage(COMPILATION_ERROR_ID)

    // Assert
    const link = await screen.findByRole('link', { name: 'Dynamic Knapsack' })
    expect(link).toHaveAttribute('href', '/problems/dynamic-knapsack')
  })

  it('falls back to the general problem page when the backend predates problemPosition', async () => {
    // Arrange: the field is absent, not null
    serveDetail({ id: 'contest-1', name: 'Copa' })
    renderPage(COMPILATION_ERROR_ID)

    // Assert
    const link = await screen.findByRole('link', { name: 'Dynamic Knapsack' })
    expect(link).toHaveAttribute('href', '/problems/dynamic-knapsack')
  })

  it('links to the general problem page for a practice submission', async () => {
    // Arrange
    serveDetail(null)
    renderPage(COMPILATION_ERROR_ID)

    // Assert
    const link = await screen.findByRole('link', { name: 'Dynamic Knapsack' })
    expect(link).toHaveAttribute('href', '/problems/dynamic-knapsack')
  })
})

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

// The viewer highlights the code, which splits it into several elements: match the <code> block by its whole text
const codeBlock = (text: string) => screen.getByText((_, el) => el?.tagName === 'CODE' && el.textContent === text)

describe('SubmissionDetailPage source code', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  function serveDetail(detail: Partial<SubmissionDetail>) {
    server.use(
      http.get('http://localhost:8080/api/submissions/:id', () => HttpResponse.json({ ...failedWithoutLog, ...detail })),
    )
  }

  it('muestra el código fuente de un envío normal', async () => {
    serveDetail({ sourceCode: 'int main() { return 0; }' })
    renderPage(COMPILATION_ERROR_ID)

    expect(await screen.findByText('Código fuente')).toBeInTheDocument()
    expect(codeBlock('int main() { return 0; }')).toBeInTheDocument()
  })

  it('avisa que el archivo ya no existe cuando el código fuente es null', async () => {
    serveDetail({ sourceCode: null })
    renderPage(COMPILATION_ERROR_ID)

    expect(
      await screen.findByText('Código fuente no disponible: el archivo de este envío ya no existe.'),
    ).toBeInTheDocument()
  })

  describe('envío del editor de bloques', () => {
    const blockly = { isBlocklySubmission: true, language: 'python310' as const, workspaceXml: '<xml>workspace-1</xml>', sourceCode: 'print(1)' }

    it('muestra los bloques por defecto', async () => {
      serveDetail(blockly)
      renderPage(COMPILATION_ERROR_ID)

      expect(await screen.findByTestId('blockly-viewer')).toHaveTextContent('<xml>workspace-1</xml>')
      expect(screen.getByRole('button', { name: 'Código Python' })).toBeInTheDocument()
    })

    it('cambia al código Python generado y vuelve a los bloques', async () => {
      serveDetail(blockly)
      const user = userEvent.setup()
      renderPage(COMPILATION_ERROR_ID)
      await screen.findByTestId('blockly-viewer')

      await user.click(screen.getByRole('button', { name: 'Código Python' }))
      expect(codeBlock('print(1)')).toBeInTheDocument()
      expect(screen.queryByTestId('blockly-viewer')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Bloques' }))

      expect(await screen.findByTestId('blockly-viewer')).toBeInTheDocument()
    })

    it('avisa que el archivo ya no existe al ver el código Python si el código es null', async () => {
      serveDetail({ ...blockly, sourceCode: null })
      const user = userEvent.setup()
      renderPage(COMPILATION_ERROR_ID)
      await screen.findByTestId('blockly-viewer')

      await user.click(screen.getByRole('button', { name: 'Código Python' }))

      expect(
        screen.getByText('Código fuente no disponible: el archivo de este envío ya no existe.'),
      ).toBeInTheDocument()
    })

    it('trata como envío normal uno de bloques sin workspace guardado', async () => {
      serveDetail({ ...blockly, workspaceXml: null })
      renderPage(COMPILATION_ERROR_ID)

      expect(await screen.findByText('Código fuente')).toBeInTheDocument()
      expect(screen.queryByTestId('blockly-viewer')).not.toBeInTheDocument()
    })
  })
})
