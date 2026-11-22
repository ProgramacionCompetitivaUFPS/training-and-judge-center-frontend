import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockProblemTwoSum } from '@/mocks/data'
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
    // Arrange: the default mock handler reads the multipart body, which hangs on Node 20 when the file
    // comes from jsdom (CI), so answer without reading it. Nothing is remembered yet; the .py extension picks Python.
    server.use(
      http.post('http://localhost:8080/api/problems/p/:slug/submissions', () =>
        HttpResponse.json({ id: 'sub-remembered-0001', status: 'PENDING' }, { status: 201 }),
      ),
    )
    const { container } = renderPage('/submit?problem=two-sum')
    await uploadPythonSolution(container)
    await waitFor(() => expect((screen.getByTestId('code-editor') as HTMLTextAreaElement).value).toBe('print(1)'), { timeout: 3000 })

    // Act
    await user.click(screen.getByRole('button', { name: /enviar solución/i }))

    // Assert
    await waitFor(
      () => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success', title: 'Solución enviada' })),
      { timeout: 3000 },
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
    await waitFor(() => expect((screen.getByTestId('code-editor') as HTMLTextAreaElement).value).toBe('print(1)'), { timeout: 3000 })

    // Act
    await user.click(screen.getByRole('button', { name: /enviar solución/i }))

    // Assert
    await waitFor(
      () => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'No se pudo enviar la solución' })),
      { timeout: 3000 },
    )
    expect(localStorage.getItem('last-submission-language')).toBeNull()
  })
})

describe('SubmitSolutionPage — panel y editor', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
    localStorage.clear()
  })
  afterEach(() => clearAccessToken())

  function serveProblem(extra: Record<string, unknown>) {
    server.use(
      http.get('http://localhost:8080/api/problems/p/:slug', () =>
        HttpResponse.json({ ...mockProblemTwoSum, ...extra }),
      ),
    )
  }

  describe('límites del problema', () => {
    it('muestra los límites generales mientras no hay lenguaje elegido', async () => {
      serveProblem({ timeLimit: 1000, memoryLimit: 256, languageOverrides: [{ language: 'python310', timeLimit: 5000 }] })
      renderPage('/submit?problem=two-sum')

      expect(await screen.findByText('1000 ms')).toBeInTheDocument()
      expect(screen.getByText('256 MiB')).toBeInTheDocument()
      expect(screen.queryByText('override')).not.toBeInTheDocument()
    })

    it('aplica el límite propio del lenguaje elegido y lo marca como override', async () => {
      localStorage.setItem('last-submission-language', 'python310')
      serveProblem({ timeLimit: 1000, memoryLimit: 256, languageOverrides: [{ language: 'python310', timeLimit: 5000 }] })
      renderPage('/submit?problem=two-sum')

      expect(await screen.findByText('5000 ms')).toBeInTheDocument()
      expect(screen.getByText('256 MiB')).toBeInTheDocument()
      expect(screen.getAllByText('override')).toHaveLength(1)
    })

    it('marca también el override de memoria', async () => {
      localStorage.setItem('last-submission-language', 'python310')
      serveProblem({ timeLimit: 1000, memoryLimit: 256, languageOverrides: [{ language: 'python310', memoryLimit: 512 }] })
      renderPage('/submit?problem=two-sum')

      expect(await screen.findByText('512 MiB')).toBeInTheDocument()
      expect(screen.getByText('1000 ms')).toBeInTheDocument()
      expect(screen.getAllByText('override')).toHaveLength(1)
    })

    it('dice «No definido» cuando el problema no tiene límites', async () => {
      serveProblem({ timeLimit: 0, memoryLimit: 0, languageOverrides: [] })
      renderPage('/submit?problem=two-sum')

      expect(await screen.findAllByText('No definido')).toHaveLength(2)
    })
  })

  describe('aviso de la clase en Java', () => {
    it('recuerda que la clase principal debe llamarse Solution', async () => {
      localStorage.setItem('last-submission-language', 'java17')
      renderPage()

      expect(await screen.findByText(/la clase principal debe llamarse/)).toBeInTheDocument()
    })

    it('avisa cuando el código declara otra clase pública', async () => {
      localStorage.setItem('last-submission-language', 'java17')
      renderPage()
      const editor = await screen.findByTestId('code-editor')

      await user.clear(editor)
      await user.click(editor)
      await user.paste('public class Main { }')

      expect(await screen.findByText(/Tu clase pública se llama "Main"/)).toBeInTheDocument()
    })

    it('detecta la clase aunque haya líneas en blanco y sangría antes', async () => {
      localStorage.setItem('last-submission-language', 'java17')
      renderPage()
      const editor = await screen.findByTestId('code-editor')

      await user.clear(editor)
      await user.click(editor)
      await user.paste(['', '', '   \t public final class Main { }'].join('\n'))

      expect(await screen.findByText(/Tu clase pública se llama "Main"/)).toBeInTheDocument()
    })

    it('no avisa si la clase pública ya se llama Solution', async () => {
      localStorage.setItem('last-submission-language', 'java17')
      renderPage()
      const editor = await screen.findByTestId('code-editor')

      await user.clear(editor)
      await user.click(editor)
      await user.paste('public class Solution { }')

      expect(await screen.findByText(/la clase principal debe llamarse/)).toBeInTheDocument()
      expect(screen.queryByText(/Tu clase pública se llama/)).not.toBeInTheDocument()
    })

    it('no se bloquea con un código enorme de líneas en blanco', async () => {
      localStorage.setItem('last-submission-language', 'java17')
      renderPage()
      const editor = (await screen.findByTestId('code-editor')) as HTMLTextAreaElement
      const start = performance.now()

      fireEvent.change(editor, { target: { value: `${'\n'.repeat(200_000)}x` } })

      expect(performance.now() - start).toBeLessThan(2000)
      expect(await screen.findByText(/la clase principal debe llamarse/)).toBeInTheDocument()
    })

    it('no avisa en otros lenguajes', async () => {
      localStorage.setItem('last-submission-language', 'python310')
      renderPage()
      await screen.findByTestId('code-editor')

      expect(screen.queryByText(/clase principal debe llamarse/)).not.toBeInTheDocument()
    })
  })

  describe('selector de problema', () => {
    it('con un problema elegido muestra su título y permite cambiarlo', async () => {
      renderPage('/submit?problem=two-sum')

      // The title is also in the breadcrumb: the picker is recognised by its «Cambiar problema» button.
      await user.click(await screen.findByRole('button', { name: 'Cambiar problema' }))

      expect(screen.getByPlaceholderText('Buscar problema publicado por título...')).toBeInTheDocument()
    })

    it('sin problema elegido ofrece la búsqueda', async () => {
      renderPage()

      expect(screen.getByPlaceholderText('Buscar problema publicado por título...')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cambiar problema' })).not.toBeInTheDocument()
    })
  })

  describe('archivo cargado', () => {
    it('rechaza un archivo de más de 1 MB', async () => {
      const { container } = renderPage('/submit?problem=two-sum')
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      await user.upload(input, new File([new Uint8Array(1024 * 1024 + 1)], 'big.py', { type: 'text/plain' }))

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Archivo muy grande' }))
    })

    it('muestra el nombre del archivo cargado y el tamaño del código', async () => {
      const { container } = renderPage('/submit?problem=two-sum')
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      await user.upload(input, new File(['print(1)'], 'solution.py', { type: 'text/plain' }))

      expect(await screen.findByText(/solution\.py \(0\.0 KB\)/)).toBeInTheDocument()
      expect(screen.getByText('0.0 KB / 1 MB')).toBeInTheDocument()
    })

    it('al escribir en el editor deja de mostrar el archivo cargado', async () => {
      const { container } = renderPage('/submit?problem=two-sum')
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(input, new File(['print(1)'], 'solution.py', { type: 'text/plain' }))
      await screen.findByText(/solution\.py/)

      await user.type(screen.getByTestId('code-editor'), 'x')

      expect(screen.queryByText(/solution\.py/)).not.toBeInTheDocument()
    })
  })

  describe('envíos recientes', () => {
    const recent = {
      submissions: [
        { id: 'abcdef0123456789', status: 'ACCEPTED', language: 'python310', memoryKb: 2048, submittedAt: new Date().toISOString() },
        { id: 'fedcba9876543210', status: 'WRONG_ANSWER', language: 'cpp17', memoryKb: null, submittedAt: new Date(Date.now() - 3 * 3600_000).toISOString() },
      ],
      pagination: { page: 1, limit: 5, total: 2, totalPages: 1 },
    }

    it('lista los envíos del problema con su tiempo relativo y memoria', async () => {
      server.use(http.get('http://localhost:8080/api/users/me/submissions', () => HttpResponse.json(recent)))
      renderPage('/submit?problem=two-sum')

      expect(await screen.findByText('Envíos recientes')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'abcdef01' })).toHaveAttribute('href', '/submissions/abcdef0123456789')
      expect(screen.getByText('Ahora')).toBeInTheDocument()
      expect(screen.getByText('Hace 3h')).toBeInTheDocument()
      expect(screen.getByText('2.0 MiB')).toBeInTheDocument()
      expect(screen.getByText('—')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /cargar$/i })).toHaveLength(2)
    })

    it('no muestra la tarjeta si el problema no tiene envíos', async () => {
      let served = false
      server.use(
        http.get('http://localhost:8080/api/users/me/submissions', () => {
          served = true
          return HttpResponse.json({ submissions: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 0 } })
        }),
      )
      renderPage('/submit?problem=two-sum')
      await screen.findByRole('button', { name: 'Cambiar problema' })
      await waitFor(() => expect(served).toBe(true))

      expect(screen.queryByText('Envíos recientes')).not.toBeInTheDocument()
    })
  })
})
