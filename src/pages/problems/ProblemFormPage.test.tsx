import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockProblemTwoSum } from '@/mocks/data'
import { ProblemFormPage } from './ProblemFormPage'

// scrollIntoView not in jsdom (used by TagPicker)
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

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

function renderCreate() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/problems/new']}>
        <Routes>
          <Route path="/problems/new" element={<ProblemFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderEdit(slug = 'two-sum') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/problems/${slug}/edit`]}>
        <Routes>
          <Route path="/problems/:slug/edit" element={<ProblemFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProblemFormPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders title field and tag picker in create mode', () => {
    renderCreate()
    expect(screen.getByRole('textbox', { name: /título/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /agregar un tag/i })).toBeInTheDocument()
  })

  it('pre-fills title in edit mode', async () => {
    const draftProblem = { ...mockProblemTwoSum, status: 'DRAFT' as const }
    server.use(
      http.get('http://localhost:8080/api/problems/p/two-sum', () =>
        HttpResponse.json(draftProblem),
      ),
    )
    renderEdit()
    expect(await screen.findByDisplayValue('Two Sum')).toBeInTheDocument()
  })

  it('shows validation error on empty submit', async () => {
    const user = userEvent.setup()
    renderCreate()
    const submitButton = screen.getByRole('button', { name: /crear|guardar/i })
    await user.click(submitButton)
    expect(await screen.findByText('El slug debe tener al menos 3 caracteres')).toBeInTheDocument()
    expect(screen.getByText('El título es requerido')).toBeInTheDocument()
  })

  it('allows adding a tag from the picker', async () => {
    const user = userEvent.setup()
    renderCreate()
    const tagInput = screen.getByRole('combobox', { name: /agregar un tag/i })
    await user.click(tagInput)
    await user.type(tagInput, 'arrays')
    const option = await screen.findByRole('option', { name: 'arrays' })
    await user.click(option)
    expect(await screen.findByRole('button', { name: /quitar el tag arrays/i })).toBeInTheDocument()
  })

  it('allows removing an added tag', async () => {
    const user = userEvent.setup()
    renderCreate()

    // Add "arrays" tag
    const tagInput = screen.getByRole('combobox', { name: /agregar un tag/i })
    await user.click(tagInput)
    await user.type(tagInput, 'arrays')
    await user.click(await screen.findByRole('option', { name: 'arrays' }))

    // Remove it
    const removeBtn = await screen.findByRole('button', { name: /quitar el tag arrays/i })
    await user.click(removeBtn)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /quitar el tag arrays/i })).not.toBeInTheDocument()
    })
  })
})

// The import goes through XMLHttpRequest (for upload progress), which MSW does not intercept.
// Only the transport is replaced here; the hook, the API client and the page run for real.
class MockXHR {
  static last: MockXHR
  static created = 0
  open = vi.fn()
  send = vi.fn()
  setRequestHeader = vi.fn()
  withCredentials = false
  timeout = 0
  status = 400
  statusText = 'Bad Request'
  responseText = ''
  upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  ontimeout: (() => void) | null = null

  constructor() {
    MockXHR.last = this
    MockXHR.created++
  }

  triggerLoad() { this.onload?.() }
  triggerProgress(loaded: number, total: number) {
    this.upload.onprogress?.({ loaded, total, lengthComputable: true } as ProgressEvent)
  }
}

async function buildZipFile(): Promise<File> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  zip.file('problem.yaml', 'name: "Suma de dos números"\ntime_limit: 1\nmemory_limit: 256\n')
  const bytes = await zip.generateAsync({ type: 'arraybuffer' })
  return new File([bytes], 'paquete.zip', { type: 'application/zip' })
}

// Fills the slug, picks a valid ZIP and confirms the review dialog, leaving the import in flight.
async function startImport(user: ReturnType<typeof userEvent.setup>) {
  renderCreate()
  await user.type(screen.getByRole('textbox', { name: /slug/i }), 'suma-dos')
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('file input not found')
  await user.upload(input, await buildZipFile())
  const importButton = await screen.findByRole('button', { name: /^importar$/i })
  await waitFor(() => expect(importButton).toBeEnabled())
  await user.click(importButton)
  await waitFor(() => expect(MockXHR.last).toBeDefined())
}

describe('ProblemFormPage importación de ZIP', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
    MockXHR.created = 0
    vi.stubGlobal('XMLHttpRequest', MockXHR)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    clearAccessToken()
  })

  it('rechaza un ZIP que supera el límite en un byte: muestra el error y no abre la revisión ni envía nada', async () => {
    // Arrange: 150 MB + 1 byte, without allocating that memory
    const user = userEvent.setup()
    renderCreate()
    const tooBig = new File(['x'], 'grande.zip', { type: 'application/zip' })
    Object.defineProperty(tooBig, 'size', { value: 150 * 1024 * 1024 + 1 })
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')
    if (!input) throw new Error('file input not found')

    // Act
    await user.upload(input, tooBig)

    // Assert
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error', title: 'El ZIP es demasiado grande' }),
      )
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(MockXHR.created).toBe(0)
  })

  it('muestra el mensaje traducido del detail code en el toast de error al importar', async () => {
    // Arrange
    const user = userEvent.setup()
    await startImport(user)
    MockXHR.last.status = 400
    MockXHR.last.responseText = JSON.stringify({
      error: 'VALIDATION_ERROR',
      message: 'Los datos enviados no son válidos',
      details: [{ field: 'file', code: 'ZIP_TOO_LARGE', message: 'raw english' }],
    })

    // Act
    MockXHR.last.triggerLoad()

    // Assert
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'error',
          description: 'El ZIP supera el tamaño máximo permitido (150 MB)',
        }),
      )
    })
  })

  it('muestra la barra de progreso durante el import y la oculta al terminar', async () => {
    // Arrange
    const user = userEvent.setup()
    await startImport(user)
    expect(screen.queryByText(/subiendo/i)).not.toBeInTheDocument()

    // Act: upload progress reported by the XHR
    act(() => MockXHR.last.triggerProgress(50, 100))

    // Assert
    expect(await screen.findByText('Subiendo… 50%')).toBeInTheDocument()

    // Act: the request ends with an error
    act(() => MockXHR.last.triggerLoad())

    // Assert
    await waitFor(() => {
      expect(screen.queryByText(/subiendo/i)).not.toBeInTheDocument()
    })
  })
})
