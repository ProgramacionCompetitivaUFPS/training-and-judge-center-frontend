import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import { useEffect } from 'react'
import { render, screen, waitFor, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { http, HttpResponse, delay } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { stubEndpoint } from '@/test/hookHarness'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockProblems } from '@/mocks/data'
import type { User } from '@/types/user'
import { ProblemDetailPage } from './ProblemDetailPage'

// Mutable so a test can place the page inside a contest
const contestSession = vi.hoisted(() => ({ contest: null as unknown }))
vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: contestSession.contest }),
}))

// Mutable so individual tests can switch to a different role
let _authUser: User = { ...mockCurrentUser }

const mockLogout = vi.hoisted(() => vi.fn())
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
    logout: mockLogout,
  }),
}))

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

// Lets a test hold the ZIP structure check open; null falls through to the real implementation
const zipPeek = vi.hoisted(() => ({ override: null as null | ((file: File) => Promise<string[] | null>) }))
vi.mock('@/lib/zipPeek', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/zipPeek')>()
  return {
    ...actual,
    peekZipEntryPaths: (file: File) => (zipPeek.override ? zipPeek.override(file) : actual.peekZipEntryPaths(file)),
  }
})

// Same idea for the upload itself (XHR, so MSW can't answer it): lets a test keep an upload running
const uploadApi = vi.hoisted(() => ({
  override: null as null | typeof import('@/api/problems').uploadProblemFile,
}))
vi.mock('@/api/problems', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/problems')>()
  return {
    ...actual,
    uploadProblemFile: (...args: Parameters<typeof actual.uploadProblemFile>) =>
      uploadApi.override ? uploadApi.override(...args) : actual.uploadProblemFile(...args),
  }
})

function renderPage(slug = 'two-sum') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/problems/${slug}`]}>
        <Routes>
          <Route path="/problems/:slug" element={<ProblemDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Lets a test navigate between problems without unmounting the page (same route, new :slug)
let navigateTo: (path: string) => void = () => {}
function NavigatorProbe() {
  const navigate = useNavigate()
  useEffect(() => {
    navigateTo = navigate
  }, [navigate])
  return null
}

describe('ProblemDetailPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    _authUser = { ...mockCurrentUser }
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders problem title', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Two Sum' })).toBeInTheDocument()
  })

  it('copia la entrada y la salida de un ejemplo con sus botones Copiar', async () => {
    // Arrange
    const user = userEvent.setup()
    renderPage('two-sum')
    const inputButton = await screen.findByRole('button', { name: 'Copiar entrada del ejemplo 1' })
    const outputButton = screen.getByRole('button', { name: 'Copiar salida del ejemplo 1' })

    // Act
    await user.click(inputButton)
    const copiedInput = await navigator.clipboard.readText()
    await user.click(outputButton)
    const copiedOutput = await navigator.clipboard.readText()

    // Assert
    expect(copiedInput).toBe('4 9\n2 7 11 15')
    expect(copiedOutput).toBe('0 1')
    expect(screen.getByRole('button', { name: 'Copiar entrada del ejemplo 2' })).toBeInTheDocument()
  })

  it('shows admin actions for ADMIN role', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Two Sum' })
    expect(screen.getByRole('button', { name: /acciones/i })).toBeInTheDocument()
  })

  it('renders not-found page on 404', async () => {
    server.use(
      http.get('http://localhost:8080/api/problems/p/:slug', () =>
        HttpResponse.json({ error: 'PROBLEM_NOT_FOUND' }, { status: 404 }),
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
    })
  })

  it('renders error page on 500', async () => {
    server.use(
      http.get('http://localhost:8080/api/problems/p/:slug', () =>
        HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    })
  })

  it('CONTESTANT (non-modifier) does not see the "acciones" button', async () => {
    // two-sum modifiers are ['mariacoach', 'luisadmin']; carloscp is not in the list
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
    renderPage()
    await screen.findByRole('heading', { name: 'Two Sum' })
    expect(screen.queryByRole('button', { name: /acciones/i })).not.toBeInTheDocument()
  })

  it('no solicita estadísticas cuando el problema está en DRAFT', async () => {
    // Arrange
    const twoSum = mockProblems.find((p) => p.slug === 'two-sum')
    let statisticsRequests = 0
    server.use(
      http.get('http://localhost:8080/api/problems/p/:slug', () =>
        HttpResponse.json({ ...twoSum, status: 'DRAFT' }),
      ),
      http.get('http://localhost:8080/api/problems/p/:slug/statistics', () => {
        statisticsRequests++
        return HttpResponse.json({})
      }),
    )

    // Act
    renderPage()
    await screen.findByRole('heading', { name: 'Two Sum' })

    // Assert
    expect(statisticsRequests).toBe(0)
  })

  describe('checklist → file picker', () => {
    const user = userEvent.setup()
    let clickSpy: MockInstance<typeof HTMLInputElement.prototype.click>

    beforeEach(() => {
      clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    })
    afterEach(() => {
      clickSpy.mockRestore()
      zipPeek.override = null
      uploadApi.override = null
    })

    it('clicking "Subir" in the checklist switches to the files tab and opens the test-cases file picker', async () => {
      // Arrange
      renderPage('segment-tree-range')
      await screen.findByRole('heading', { name: 'Segment Tree Range Query' })

      // Act
      const [subirButton] = await screen.findAllByRole('button', { name: /subir/i })
      await user.click(subirButton)

      // Assert
      expect(await screen.findByText('Archivos')).toBeInTheDocument()
      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(document.querySelector<HTMLInputElement>('input[type="file"]')?.accept).toBe('.zip')
    })

    it('clicking "Agregar" in the checklist switches to the files tab and opens the solution file picker', async () => {
      // Arrange
      renderPage('segment-tree-range')
      await screen.findByRole('heading', { name: 'Segment Tree Range Query' })

      // Act
      const [agregarButton] = await screen.findAllByRole('button', { name: /agregar/i })
      await user.click(agregarButton)

      // Assert
      expect(await screen.findByText('Soluciones')).toBeInTheDocument()
      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(document.querySelector<HTMLInputElement>('input[type="file"]')?.accept).toBe('.cpp,.py,.java')
    })

    it('does not discard the file chosen after opening the picker from the checklist (wrong format shows its toast)', async () => {
      // Arrange — FilesManager mounts only when the checklist switches to the files tab
      const pickerUser = userEvent.setup({ applyAccept: false })
      renderPage('segment-tree-range')
      await screen.findByRole('heading', { name: 'Segment Tree Range Query' })
      const [subirButton] = await screen.findAllByRole('button', { name: /subir/i })
      await pickerUser.click(subirButton)
      await screen.findByText('Archivos')

      // Act
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
      await pickerUser.upload(input, new File(['x'], 'notas.txt', { type: 'text/plain' }))

      // Assert
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Formato de archivo incorrecto' }))
    })

    it('disables the checklist actions while the test-cases ZIP is being checked, and frees them if it is rejected', async () => {
      // Arrange — hold the ZIP check open
      let finishCheck: (paths: string[] | null) => void = () => {}
      zipPeek.override = () => new Promise((resolve) => { finishCheck = resolve })
      const pickerUser = userEvent.setup({ applyAccept: false })
      renderPage('segment-tree-range')
      await screen.findByRole('heading', { name: 'Segment Tree Range Query' })
      const [subirButton] = await screen.findAllByRole('button', { name: /subir/i })
      await pickerUser.click(subirButton)
      await screen.findByText('Archivos')

      // Act
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
      await pickerUser.upload(input, new File(['x'], 'tests.zip', { type: 'application/zip' }))

      // Assert — nothing can start another upload during the check
      await waitFor(() => {
        const actions = screen.getAllByRole('button', { name: /subir|agregar/i })
        expect(actions.length).toBeGreaterThan(0)
        actions.forEach((button) => expect(button).toBeDisabled())
      })
      const checklistActions = screen.getAllByRole('button', { name: /agregar/i })
      expect(screen.getByRole('status')).toHaveTextContent(/revisando el zip/i)

      // The ZIP is rejected: the busy state is released
      await act(async () => { finishCheck(null) })
      await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Estructura del ZIP incorrecta' })))
      await waitFor(() => checklistActions.forEach((button) => expect(button).toBeEnabled()))
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('keeps every upload button blocked and the ZIP status visible when the user leaves the files tab and comes back during the ZIP check', async () => {
      // Arrange — hold the ZIP check open
      let finishCheck: (paths: string[] | null) => void = () => {}
      zipPeek.override = () => new Promise((resolve) => { finishCheck = resolve })
      const pickerUser = userEvent.setup({ applyAccept: false })
      renderPage('segment-tree-range')
      await screen.findByRole('heading', { name: 'Segment Tree Range Query' })
      const [subirButton] = await screen.findAllByRole('button', { name: /subir/i })
      await pickerUser.click(subirButton)
      await screen.findByText('Archivos')
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
      await pickerUser.upload(input, new File(['x'], 'tests.zip', { type: 'application/zip' }))
      expect(await screen.findByRole('status')).toHaveTextContent(/revisando el zip/i)

      // Act — FilesManager unmounts and a new one mounts while the check is still pending
      await pickerUser.click(screen.getByRole('tab', { name: /problema/i }))
      await pickerUser.click(screen.getByRole('tab', { name: /archivos/i }))

      // Assert
      expect(await screen.findByRole('status')).toHaveTextContent(/revisando el zip/i)
      screen.getAllByRole('button', { name: /subir|reemplazar|agregar/i }).forEach((button) => expect(button).toBeDisabled())

      await act(async () => { finishCheck(null) })
    })

    it('keeps the progress bar and the blocked buttons when the user leaves the files tab and comes back mid-upload', async () => {
      // Arrange — an upload that stays running until the test ends it
      let report: (pct: number) => void = () => {}
      let failUpload = () => {}
      uploadApi.override = (_slug, _fileType, _file, onProgress) => {
        report = (pct) => onProgress?.(pct)
        return new Promise<never>((_, reject) => { failUpload = () => reject(new Error('fail')) })
      }
      const pickerUser = userEvent.setup({ applyAccept: false })
      renderPage('segment-tree-range')
      await screen.findByRole('heading', { name: 'Segment Tree Range Query' })
      const [agregarButton] = await screen.findAllByRole('button', { name: /agregar/i })
      await pickerUser.click(agregarButton)
      await screen.findByText('Soluciones')

      // Act — start the upload: the bar is there from the first moment, not after the first event
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
      await pickerUser.upload(input, new File(['print(1)'], 'sol.py', { type: 'text/x-python' }))
      expect(await screen.findByText('Subiendo… 0%')).toBeInTheDocument()
      await waitFor(() => expect(typeof report).toBe('function'))
      act(() => report(40))
      expect(await screen.findByText('Subiendo… 40%')).toBeInTheDocument()

      // Assert — leave the files tab (FilesManager unmounts) and come back
      await pickerUser.click(screen.getByRole('tab', { name: /problema/i }))
      await pickerUser.click(screen.getByRole('tab', { name: /archivos/i }))
      expect(await screen.findByText('Subiendo… 40%')).toBeInTheDocument()
      screen.getAllByRole('button', { name: /subir|reemplazar|agregar/i }).forEach((button) => expect(button).toBeDisabled())

      // The upload ends: the bar goes away
      act(() => failUpload())
      await waitFor(() => expect(screen.queryByText(/subiendo…/i)).not.toBeInTheDocument())
    })
  })
})

describe('ProblemDetailPage — advertencias de casos de prueba', () => {
  beforeEach(() => {
    _authUser = { ...mockCurrentUser }   // ADMIN role
    setAccessToken('mock-jwt-token-luisadmin')
  })
  afterEach(() => clearAccessToken())

  it('muestra ícono de advertencia en el checklist cuando no hay casos secretos', async () => {
    const twoSum = mockProblems.find((p) => p.slug === 'two-sum')
    server.use(
      http.get('http://localhost:8080/api/problems/p/:slug', () =>
        HttpResponse.json({ ...twoSum, status: 'DRAFT' }),
      ),
      http.get('http://localhost:8080/api/problems/p/:slug/testcases', () =>
        HttpResponse.json({ hasTestCases: true, sampleCount: 2, secretCount: 0, cases: [] }),
      ),
    )
    renderPage()
    await screen.findByRole('heading', { name: 'Two Sum' })
    // The checklist renders twice (mobile + desktop), so the icon appears more than once
    expect((await screen.findAllByLabelText('Advertencia')).length).toBeGreaterThan(0)
  })

  it('muestra ícono de advertencia en el checklist cuando no hay casos de ejemplo', async () => {
    const twoSum = mockProblems.find((p) => p.slug === 'two-sum')
    server.use(
      http.get('http://localhost:8080/api/problems/p/:slug', () =>
        HttpResponse.json({ ...twoSum, status: 'DRAFT' }),
      ),
      http.get('http://localhost:8080/api/problems/p/:slug/testcases', () =>
        HttpResponse.json({ hasTestCases: true, sampleCount: 0, secretCount: 3, cases: [] }),
      ),
    )
    renderPage()
    await screen.findByRole('heading', { name: 'Two Sum' })
    // The checklist renders twice (mobile + desktop), so the icon appears more than once
    expect((await screen.findAllByLabelText('Advertencia')).length).toBeGreaterThan(0)
  })

  it('muestra nota de advertencia en la sección Archivos cuando no hay secretos', async () => {
    const twoSum = mockProblems.find((p) => p.slug === 'two-sum')
    server.use(
      http.get('http://localhost:8080/api/problems/p/:slug', () =>
        HttpResponse.json({ ...twoSum, status: 'DRAFT' }),
      ),
      http.get('http://localhost:8080/api/problems/p/:slug/testcases', () =>
        HttpResponse.json({ hasTestCases: true, sampleCount: 2, secretCount: 0, cases: [] }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Two Sum' })
    // Switch to the files tab (tab trigger label is "Archivos y colaboradores")
    await user.click(screen.getByRole('tab', { name: /archivos y colaboradores/i }))
    // The warning note appears below the Casos de prueba row
    expect(await screen.findByText(/no hay casos secretos/i)).toBeInTheDocument()
  })

  it('muestra diálogo de confirmación al publicar cuando hay advertencias activas', async () => {
    const twoSum = mockProblems.find((p) => p.slug === 'two-sum')
    server.use(
      http.get('http://localhost:8080/api/problems/p/:slug', () =>
        HttpResponse.json({ ...twoSum, status: 'DRAFT' }),
      ),
      http.get('http://localhost:8080/api/problems/p/:slug/testcases', () =>
        HttpResponse.json({ hasTestCases: true, sampleCount: 2, secretCount: 0, cases: [] }),
      ),
      // Validation must be passed so the Publicar button is enabled
      http.get('http://localhost:8080/api/problems/p/:slug/validation', () =>
        HttpResponse.json({
          found: true, terminal: true, passed: true, stale: false,
          status: 'DRAFT', validationLogs: ['✓ Pasó'],
        }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Two Sum' })
    // Publicar is in the page header — visible from any tab; wait for it to be enabled
    // Re-query inside waitFor: the disabled tooltip branch is swapped for a new button once validation resolves
    await waitFor(() => expect(screen.getByRole('button', { name: /^publicar$/i })).not.toBeDisabled())

    await user.click(screen.getByRole('button', { name: /^publicar$/i }))

    // A confirmation dialog appears (not an immediate publish call)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/advertencias/i)).toBeInTheDocument()
  })

  describe('confirmación al publicar', () => {
    const published: string[] = []
    beforeEach(() => {
      published.length = 0
    })

    // A draft whose validation already passed, so Publicar is enabled; `testcases` decides the warnings.
    function mockDraft(testcases: () => Response | Promise<Response>) {
      const twoSum = mockProblems.find((p) => p.slug === 'two-sum')
      server.use(
        http.get('http://localhost:8080/api/problems/p/:slug', ({ params }) =>
          HttpResponse.json({
            ...twoSum,
            slug: params.slug,
            title: params.slug === 'two-sum' ? twoSum?.title : 'Other Problem',
            status: 'DRAFT',
          }),
        ),
        http.get('http://localhost:8080/api/problems/p/:slug/testcases', testcases),
        http.get('http://localhost:8080/api/problems/p/:slug/validation', () =>
          HttpResponse.json({ found: true, terminal: true, passed: true, stale: false, status: 'DRAFT', validationLogs: [] }),
        ),
        http.post('http://localhost:8080/api/problems/p/:slug/publish', ({ params }) => {
          published.push(String(params.slug))
          return HttpResponse.json({ validationLogs: [] })
        }),
      )
    }

    const noSecrets = () => HttpResponse.json({ hasTestCases: true, sampleCount: 2, secretCount: 0, cases: [] })
    const complete = () => HttpResponse.json({ hasTestCases: true, sampleCount: 2, secretCount: 3, cases: [] })

    async function clickPublish(user: ReturnType<typeof userEvent.setup>) {
      // Re-query: the disabled tooltip branch is swapped for a new button once validation resolves
      await waitFor(() => expect(screen.getByRole('button', { name: /^publicar$/i })).not.toBeDisabled())
      await user.click(screen.getByRole('button', { name: /^publicar$/i }))
    }

    it('abrir el diálogo no publica; confirmar envía una única petición con el slug del problema', async () => {
      mockDraft(noSecrets)
      const user = userEvent.setup()
      renderPage()
      await screen.findByRole('heading', { name: 'Two Sum' })

      await clickPublish(user)
      expect(await screen.findByRole('dialog')).toBeInTheDocument()
      expect(published).toEqual([])

      await user.click(screen.getByRole('button', { name: /publicar de todas formas/i }))
      await waitFor(() => expect(published).toEqual(['two-sum']))
    })

    it('cancelar el diálogo no publica', async () => {
      mockDraft(noSecrets)
      const user = userEvent.setup()
      renderPage()
      await screen.findByRole('heading', { name: 'Two Sum' })

      await clickPublish(user)
      await user.click(await screen.findByRole('button', { name: /^cancelar$/i }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(published).toEqual([])
    })

    it('sin advertencias publica directamente, sin diálogo', async () => {
      let served = false
      mockDraft(() => {
        served = true
        return complete()
      })
      const user = userEvent.setup()
      renderPage()
      await screen.findByRole('heading', { name: 'Two Sum' })
      await waitFor(() => expect(served).toBe(true))
      await new Promise((resolve) => setTimeout(resolve, 50)) // let the response reach the query cache

      await clickPublish(user)

      await waitFor(() => expect(published).toEqual(['two-sum']))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('pide confirmación si no se pudieron comprobar los casos de prueba (la consulta falló)', async () => {
      mockDraft(() => HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))
      const user = userEvent.setup()
      renderPage()
      await screen.findByRole('heading', { name: 'Two Sum' })

      await clickPublish(user)

      expect(await screen.findByRole('dialog')).toHaveTextContent(/casos de prueba sin comprobar/i)
      expect(screen.getByRole('dialog')).toHaveTextContent(/no se pudieron revisar/i)
      expect(published).toEqual([])

      await user.click(screen.getByRole('button', { name: /publicar de todas formas/i }))
      await waitFor(() => expect(published).toEqual(['two-sum']))
    })

    it('pide confirmación mientras los casos de prueba siguen cargando', async () => {
      mockDraft(async () => {
        await delay('infinite')
        return complete()
      })
      const user = userEvent.setup()
      renderPage()
      await screen.findByRole('heading', { name: 'Two Sum' })

      await clickPublish(user)

      expect(await screen.findByRole('dialog')).toHaveTextContent(/todavía se están revisando/i)
      expect(published).toEqual([])
    })

    it('cierra el diálogo al navegar a otro problema y no publica el nuevo', async () => {
      mockDraft(noSecrets)
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={['/problems/two-sum']}>
            <NavigatorProbe />
            <Routes>
              <Route path="/problems/:slug" element={<ProblemDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
      await screen.findByRole('heading', { name: 'Two Sum' })
      await clickPublish(user)
      expect(await screen.findByRole('dialog')).toBeInTheDocument()

      act(() => navigateTo('/problems/otro-problema'))

      expect(await screen.findByRole('heading', { name: 'Other Problem' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(published).toEqual([])
    })
  })
})

describe('ProblemDetailPage — visibilidad (accesibilidad) desde el menú de acciones', () => {
  const accessibilityUrl = 'http://localhost:8080/api/problems/p/:slug/accessibility'
  let requests: { slug: string; body: unknown }[]

  beforeEach(() => {
    _authUser = { ...mockCurrentUser }
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
    requests = []
    server.use(
      http.patch(accessibilityUrl, async ({ params, request }) => {
        requests.push({ slug: String(params.slug), body: await request.json() })
        return new HttpResponse(null, { status: 204 })
      }),
    )
  })
  afterEach(() => clearAccessToken())

  async function openActionsMenu(user: ReturnType<typeof userEvent.setup>, heading: string) {
    await screen.findByRole('heading', { name: heading })
    await user.click(screen.getByRole('button', { name: /más acciones/i }))
  }

  it('ofrece "Hacer público" en un problema publicado y privado, aunque "Editar" esté bloqueado', async () => {
    const user = userEvent.setup()
    renderPage('merge-sort')
    await openActionsMenu(user, 'Merge Sort')

    expect(screen.getByRole('menuitem', { name: /editar/i })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('menuitem', { name: /hacer público/i })).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('hacerlo público envía PUBLIC sin pedir confirmación y avisa con un toast', async () => {
    const user = userEvent.setup()
    renderPage('merge-sort')
    await openActionsMenu(user, 'Merge Sort')

    await user.click(screen.getByRole('menuitem', { name: /hacer público/i }))

    await waitFor(() => expect(requests).toEqual([{ slug: 'merge-sort', body: { accessibility: 'PUBLIC' } }]))
    // The request is recorded before the answer: the toast only shows once the mutation settles
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success', title: 'El problema ahora es público' })),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('en un problema público ofrece "Hacer privado" y pide confirmación antes de enviarlo', async () => {
    const user = userEvent.setup()
    renderPage('two-sum')
    await openActionsMenu(user, 'Two Sum')

    await user.click(screen.getByRole('menuitem', { name: /hacer privado/i }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(/hacer privado el problema/i)
    expect(requests).toEqual([])

    await user.click(within(dialog).getByRole('button', { name: /hacer privado/i }))

    await waitFor(() => expect(requests).toEqual([{ slug: 'two-sum', body: { accessibility: 'PRIVATE' } }]))
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success', title: 'El problema ahora es privado' })),
    )
  })

  it('cierra la confirmación al navegar a otro problema y no cambia la accesibilidad del nuevo, ni al volver', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={['/problems/two-sum']}>
          <NavigatorProbe />
          <Routes>
            <Route path="/problems/:slug" element={<ProblemDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await openActionsMenu(user, 'Two Sum')
    await user.click(screen.getByRole('menuitem', { name: /hacer privado/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    act(() => navigateTo('/problems/graph-bfs'))

    expect(await screen.findByRole('heading', { name: 'Graph BFS' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    act(() => navigateTo('/problems/two-sum'))

    expect(await screen.findByRole('heading', { name: 'Two Sum' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requests).toEqual([])
  })

  it('cancelar la confirmación no envía nada', async () => {
    const user = userEvent.setup()
    renderPage('two-sum')
    await openActionsMenu(user, 'Two Sum')
    await user.click(screen.getByRole('menuitem', { name: /hacer privado/i }))

    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /cancelar/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(requests).toEqual([])
  })

  it('muestra un toast de error si el backend rechaza el cambio', async () => {
    server.use(
      http.patch(accessibilityUrl, () =>
        HttpResponse.json({ error: 'INSUFFICIENT_PERMISSIONS', message: 'Sin permiso' }, { status: 403 }),
      ),
    )
    const user = userEvent.setup()
    renderPage('merge-sort')
    await openActionsMenu(user, 'Merge Sort')

    await user.click(screen.getByRole('menuitem', { name: /hacer público/i }))

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'No se pudo cambiar la visibilidad' })),
    )
  })

  it('también está disponible en un borrador', async () => {
    const user = userEvent.setup()
    renderPage('segment-tree-range')
    await openActionsMenu(user, 'Segment Tree Range Query')

    expect(screen.getByRole('menuitem', { name: /hacer público/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Contenido de la página, acciones del menú y diálogos
// ---------------------------------------------------------------------------

describe('ProblemDetailPage — contenido y acciones', () => {
  const API = 'http://localhost:8080/api'
  const user = userEvent.setup()

  beforeEach(() => {
    _authUser = { ...mockCurrentUser }
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
    contestSession.contest = null
  })
  afterEach(() => {
    clearAccessToken()
    contestSession.contest = null
  })

  function LocationProbe() {
    const location = useLocation()
    return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
  }

  function renderAt(path: string) {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/problems/:slug" element={<ProblemDetailPage />} />
            <Route path="/groups/:groupId/contests/:contestId/problems/:letter" element={<ProblemDetailPage />} />
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  function stubProblem(slug: string, overrides: Record<string, unknown>) {
    const base = mockProblems.find((p) => p.slug === slug)
    server.use(http.get(`${API}/problems/p/:slug`, () => HttpResponse.json({ ...base, ...overrides })))
  }

  async function openMenu() {
    await user.click(await screen.findByRole('button', { name: /más acciones/i }))
  }

  describe('encabezado y metadatos', () => {
    it('muestra las etiquetas, el slug, y para quien gestiona el estado y la visibilidad', async () => {
      renderAt('/problems/two-sum')

      expect(await screen.findByText('arrays')).toBeInTheDocument()
      expect(screen.getByText('hash-table')).toBeInTheDocument()
      expect(screen.getByText('two-sum')).toBeInTheDocument()
      expect(screen.getByText('Publicado')).toBeInTheDocument()
      expect(screen.getByText('Público')).toBeInTheDocument()
    })

    it('quien solo compite no ve el estado ni la visibilidad', async () => {
      _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
      renderAt('/problems/two-sum')

      await screen.findByRole('heading', { name: 'Two Sum' })
      expect(screen.queryByText('Publicado')).not.toBeInTheDocument()
      expect(screen.queryByText('Público')).not.toBeInTheDocument()
    })

    it('un borrador privado se rotula como Borrador y Privado', async () => {
      renderAt('/problems/segment-tree-range')

      expect(await screen.findByText('Borrador')).toBeInTheDocument()
      expect(screen.getByText('Privado')).toBeInTheDocument()
    })

    it('la metadata lista autor, límites, overrides por lenguaje y fecha de creación', async () => {
      renderAt('/problems/two-sum')

      expect(await screen.findByText('María Coach', { selector: 'span' })).toBeInTheDocument()
      expect(screen.getByText('2000 ms')).toBeInTheDocument()
      expect(screen.getByText('256 MiB')).toBeInTheDocument()
      expect(screen.getByText('Overrides por lenguaje')).toBeInTheDocument()
      expect(screen.getByText('python310')).toBeInTheDocument()
      expect(screen.getByText('4000ms')).toBeInTheDocument()
      expect(screen.getByText('Creado')).toBeInTheDocument()
    })

    it('sin límites definidos dice «No definido»', async () => {
      stubProblem('two-sum', { timeLimit: null, memoryLimit: null, languageOverrides: [] })
      renderAt('/problems/two-sum')

      expect(await screen.findAllByText('No definido')).toHaveLength(2)
      expect(screen.queryByText('Overrides por lenguaje')).not.toBeInTheDocument()
    })

    it('un problema sin enunciado dice «Sin enunciado aún» y uno sin ejemplos no muestra la tarjeta', async () => {
      renderAt('/problems/segment-tree-range')

      expect(await screen.findByText('Sin enunciado aún')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Ejemplos' })).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Enunciado' })).toBeInTheDocument()
    })

    it('un problema publicado no rotula el enunciado', async () => {
      renderAt('/problems/two-sum')

      await screen.findByRole('heading', { name: 'Ejemplos' })
      expect(screen.queryByRole('heading', { name: 'Enunciado' })).not.toBeInTheDocument()
    })
  })

  describe('estadísticas', () => {
    it('muestra envíos, intentos, resueltos, tasa de éxito, veredictos y aceptación por lenguaje', async () => {
      renderAt('/problems/two-sum')

      expect(await screen.findByText('Estadísticas')).toBeInTheDocument()
      expect(screen.getByText('1250')).toBeInTheDocument()
      expect(screen.getByText('234')).toBeInTheDocument()
      expect(screen.getByText('89')).toBeInTheDocument()
      expect(screen.getByText('38%')).toBeInTheDocument()
      expect(screen.getByText('Veredictos')).toBeInTheDocument()
      expect(screen.getByText('36%')).toBeInTheDocument()
      expect(screen.getByText('Por lenguaje')).toBeInTheDocument()
      expect(screen.getByText('java17')).toBeInTheDocument()
      expect(screen.getByText('70%')).toBeInTheDocument()
    })

    it('sin envíos no muestra la tarjeta de estadísticas', async () => {
      server.use(http.get(`${API}/problems/p/:slug/statistics`, () => HttpResponse.json({ totalSubmissions: 0 })))
      renderAt('/problems/two-sum')

      await screen.findByRole('heading', { name: 'Two Sum' })
      await waitFor(() => expect(screen.queryByText('Estadísticas')).not.toBeInTheDocument())
    })

    it('sin intentos no muestra la tasa de éxito', async () => {
      server.use(
        http.get(`${API}/problems/p/:slug/statistics`, () =>
          HttpResponse.json({ totalSubmissions: 4, uniqueUsers: { attempted: 0, solved: 0 } }),
        ),
      )
      renderAt('/problems/two-sum')

      expect(await screen.findByText('Estadísticas')).toBeInTheDocument()
      expect(screen.queryByText('Tasa de éxito')).not.toBeInTheDocument()
      expect(screen.queryByText('Veredictos')).not.toBeInTheDocument()
    })
  })

  describe('enviar solución y ver envíos', () => {
    it('Enviar solución lleva al formulario con el problema elegido', async () => {
      renderAt('/problems/two-sum')

      await user.click(await screen.findByRole('button', { name: 'Enviar solución' }))

      expect(await screen.findByTestId('location')).toHaveTextContent('/submit?problem=two-sum')
    })

    it('Ver envíos lleva a los envíos del problema', async () => {
      renderAt('/problems/two-sum')

      await user.click(await screen.findByRole('button', { name: 'Ver envíos' }))

      expect(await screen.findByTestId('location')).toHaveTextContent('/problems/two-sum/submissions')
    })

    it('un borrador no ofrece enviar soluciones', async () => {
      renderAt('/problems/segment-tree-range')

      await screen.findByRole('heading', { name: 'Segment Tree Range Query' })
      expect(screen.queryByRole('button', { name: 'Enviar solución' })).not.toBeInTheDocument()
    })
  })

  describe('pestañas', () => {
    it('?tab=files abre la pestaña de archivos y no muestra el enunciado', async () => {
      renderAt('/problems/two-sum?tab=files')

      await screen.findByRole('heading', { name: 'Two Sum' })
      expect(screen.queryByRole('heading', { name: 'Ejemplos' })).not.toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /archivos y colaboradores/i })).toHaveAttribute('aria-selected', 'true')
    })

    it('cambiar de pestaña alterna entre el enunciado y los archivos', async () => {
      renderAt('/problems/two-sum')
      await screen.findByRole('heading', { name: 'Ejemplos' })

      await user.click(screen.getByRole('tab', { name: /archivos y colaboradores/i }))
      expect(screen.queryByRole('heading', { name: 'Ejemplos' })).not.toBeInTheDocument()

      await user.click(screen.getByRole('tab', { name: 'Problema' }))
      expect(await screen.findByRole('heading', { name: 'Ejemplos' })).toBeInTheDocument()
    })

    it('un borrador sin casos de prueba ni soluciones marca la pestaña de archivos', async () => {
      renderAt('/problems/segment-tree-range')

      expect(await screen.findByRole('img', { name: 'Faltan archivos por subir' })).toBeInTheDocument()
    })

    it('quien solo lee el problema no tiene pestañas', async () => {
      _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
      renderAt('/problems/two-sum')

      await screen.findByRole('heading', { name: 'Two Sum' })
      expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    })
  })

  describe('menú de acciones', () => {
    it('Editar lleva al formulario de edición de un borrador', async () => {
      renderAt('/problems/segment-tree-range')
      await openMenu()

      await user.click(screen.getByRole('menuitem', { name: /editar/i }))

      expect(await screen.findByTestId('location')).toHaveTextContent('/problems/segment-tree-range/edit')
    })

    it('un problema publicado explica que hay que despublicarlo para editarlo', async () => {
      renderAt('/problems/two-sum')
      await openMenu()

      expect(screen.getByText('Despublica el problema para editarlo')).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /despublicar/i })).toBeInTheDocument()
    })

    it('un borrador no ofrece despublicar', async () => {
      renderAt('/problems/segment-tree-range')
      await openMenu()

      expect(screen.queryByRole('menuitem', { name: /despublicar/i })).not.toBeInTheDocument()
    })

    it('despublicar pide confirmación, llama al servidor y avisa', async () => {
      const calls = stubEndpoint('post', '/problems/p/two-sum/unpublish', { body: { slug: 'two-sum', status: 'DRAFT' } })
      renderAt('/problems/two-sum')
      await openMenu()

      await user.click(screen.getByRole('menuitem', { name: /despublicar/i }))
      const dialog = await screen.findByRole('dialog')
      expect(calls).toHaveLength(0)
      await user.click(within(dialog).getByRole('button', { name: 'Despublicar' }))

      await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success', title: 'Problema despublicado' })))
      expect(calls).toHaveLength(1)
    })

    it('si el problema está en una competencia activa explica por qué no se puede despublicar', async () => {
      stubEndpoint('post', '/problems/p/two-sum/unpublish', { status: 409, body: { error: 'PROBLEM_IN_ACTIVE_CONTEST', message: 'x' } })
      renderAt('/problems/two-sum')
      await openMenu()

      await user.click(screen.getByRole('menuitem', { name: /despublicar/i }))
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Despublicar' }))

      await waitFor(() =>
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'No se puede despublicar' })),
      )
    })

    it('si despublicar falla por otra causa muestra un aviso genérico', async () => {
      stubEndpoint('post', '/problems/p/two-sum/unpublish', { status: 500, body: { error: 'INTERNAL_SERVER_ERROR' } })
      renderAt('/problems/two-sum')
      await openMenu()

      await user.click(screen.getByRole('menuitem', { name: /despublicar/i }))
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Despublicar' }))

      await waitFor(() =>
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al despublicar' })),
      )
    })

    it('Rejuzgar (global) pide confirmación y lo inicia', async () => {
      const calls = stubEndpoint('post', '/admin/problems/two-sum/rejudge', { body: { message: 'ok' } })
      renderAt('/problems/two-sum')
      await openMenu()

      await user.click(screen.getByRole('menuitem', { name: /rejuzgar \(global\)/i }))
      const dialog = await screen.findByRole('dialog')
      expect(calls).toHaveLength(0)
      await user.click(within(dialog).getByRole('button', { name: 'Rejuzgar' }))

      await waitFor(() =>
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rejuzgamiento global iniciado' })),
      )
      expect(calls[0].search).toBe('')
    })

    it('un coach que no es administrador no ve Rejuzgar (global)', async () => {
      _authUser = { ...mockCurrentUser, role: 'COACH', nickname: 'mariacoach' }
      renderAt('/problems/two-sum')
      await openMenu()

      expect(screen.queryByRole('menuitem', { name: /rejuzgar/i })).not.toBeInTheDocument()
    })

    it('si falla exportar avisa que no se pudo exportar', async () => {
      server.use(http.get(`${API}/problems/p/:slug/export`, () => HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })))
      renderAt('/problems/two-sum')
      await openMenu()

      await user.click(screen.getByRole('menuitem', { name: /exportar zip/i }))

      await waitFor(() =>
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'No se pudo exportar el problema' })),
      )
    })
  })

  describe('eliminar', () => {
    async function openDeleteDialog() {
      await openMenu()
      await user.click(screen.getByRole('menuitem', { name: /eliminar/i }))
      return screen.findByRole('dialog')
    }

    it('exige escribir el slug, elimina y vuelve al listado', async () => {
      const calls = stubEndpoint('delete', '/problems/p/segment-tree-range')
      renderAt('/problems/segment-tree-range')

      const dialog = await openDeleteDialog()
      const confirm = within(dialog).getByRole('button', { name: 'Eliminar' })
      expect(confirm).toBeDisabled()
      await user.type(within(dialog).getByLabelText('Confirmar slug'), 'segment-tree-range')
      await user.click(confirm)

      await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Problema eliminado' })))
      expect(calls[0].body).toEqual({ confirmSlug: 'segment-tree-range' })
      expect(await screen.findByTestId('location')).toHaveTextContent('/problems')
    })

    it('un problema publicado advierte y ofrece despublicar en vez de eliminar', async () => {
      renderAt('/problems/two-sum')

      const dialog = await openDeleteDialog()
      expect(within(dialog).getByText('Este problema está publicado.')).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Eliminar de todos modos' })).toBeDisabled()

      await user.click(within(dialog).getByRole('button', { name: 'Despublicar en vez de eliminar' }))

      expect(await screen.findByText('Despublicar problema')).toBeInTheDocument()
    })

    it('cancelar cierra el diálogo y olvida lo escrito', async () => {
      renderAt('/problems/segment-tree-range')
      const dialog = await openDeleteDialog()
      await user.type(within(dialog).getByLabelText('Confirmar slug'), 'segm')

      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      const reopened = await openDeleteDialog()

      expect(within(reopened).getByLabelText('Confirmar slug')).toHaveValue('')
    })

    it.each([
      ['PROBLEM_IN_ACTIVE_CONTEST', 'No se puede eliminar', /competencia activa/],
      ['PROBLEM_HAS_CONTEST_HISTORY', 'No se puede eliminar', /Despublícalo en su lugar/],
      ['OTHER', 'Error al eliminar', undefined],
    ])('si el servidor rechaza con %s avisa «%s»', async (code, title, description) => {
      stubEndpoint('delete', '/problems/p/segment-tree-range', { status: 409, body: { error: code, message: 'x' } })
      renderAt('/problems/segment-tree-range')
      const dialog = await openDeleteDialog()
      await user.type(within(dialog).getByLabelText('Confirmar slug'), 'segment-tree-range')

      await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

      await waitFor(() =>
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'error', title, ...(description ? { description: expect.stringMatching(description) } : {}) }),
        ),
      )
    })

    it('solo el autor o un administrador ve Eliminar', async () => {
      _authUser = { ...mockCurrentUser, role: 'COACH', nickname: 'mariacoach' }
      stubProblem('segment-tree-range', { modifiers: [{ nickname: 'mariacoach', name: 'María Coach' }], author: { nickname: 'luisadmin', name: 'Luis Admin' } })
      renderAt('/problems/segment-tree-range')
      await openMenu()

      expect(screen.queryByRole('menuitem', { name: /eliminar/i })).not.toBeInTheDocument()
    })
  })

  describe('validar y publicar', () => {
    const readyDraft = () => ({
      status: 'DRAFT',
      statement: 'Enunciado',
      timeLimit: 1000,
      memoryLimit: 256,
      files: { testCases: true, solutions: [{ filename: 's.cpp', language: 'cpp20' }], checker: false, validator: false },
    })

    it('con los requisitos completos la lista invita a validar y Validar llama al servidor', async () => {
      stubProblem('two-sum', readyDraft())
      const calls = stubEndpoint('post', '/problems/p/two-sum/validate', { body: { message: 'ok' } })
      renderAt('/problems/two-sum')

      expect((await screen.findAllByText('Compila todo y lo prueba con tus soluciones.')).length).toBeGreaterThan(0)
      await user.click((await screen.findAllByRole('button', { name: 'Validar' }))[0])

      await waitFor(() => expect(calls).toHaveLength(1))
    })

    it('si validar falla avisa que no se pudo validar', async () => {
      stubProblem('two-sum', readyDraft())
      stubEndpoint('post', '/problems/p/two-sum/validate', { status: 500, body: { error: 'INTERNAL_SERVER_ERROR' } })
      renderAt('/problems/two-sum')

      await user.click((await screen.findAllByRole('button', { name: 'Validar' }))[0])

      await waitFor(() =>
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'No se pudo validar' })),
      )
    })

    it('si faltan requisitos la validación pide completar los pasos anteriores y Publicar está deshabilitado', async () => {
      renderAt('/problems/segment-tree-range')

      expect((await screen.findAllByText('Antes completa los pasos de arriba')).length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: /^publicar$/i })).toBeDisabled()
    })

    it('si la última validación falló lo dice y ofrece reintentar', async () => {
      stubProblem('two-sum', readyDraft())
      server.use(
        http.get(`${API}/problems/p/:slug/validation`, () =>
          HttpResponse.json({ found: true, terminal: true, passed: false, status: 'DRAFT', validationLogs: [] }),
        ),
      )
      renderAt('/problems/two-sum')

      expect((await screen.findAllByText('La última validación falló.')).length).toBeGreaterThan(0)
      expect((await screen.findAllByRole('button', { name: 'Reintentar' })).length).toBeGreaterThan(0)
    })

    it('si el problema cambió después de validarlo lo avisa y no deja publicar', async () => {
      stubProblem('two-sum', readyDraft())
      server.use(
        http.get(`${API}/problems/p/:slug/validation`, () =>
          HttpResponse.json({ found: true, terminal: true, passed: true, stale: true, status: 'DRAFT', validationLogs: [] }),
        ),
      )
      renderAt('/problems/two-sum')

      expect((await screen.findAllByText('Cambiaste el problema después de validarlo.')).length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: /^publicar$/i })).toBeDisabled()
    })

    it('publicar sin advertencias muestra el detalle de la validación cuando el servidor lo devuelve', async () => {
      stubProblem('two-sum', readyDraft())
      server.use(
        http.get(`${API}/problems/p/:slug/testcases`, () =>
          HttpResponse.json({ hasTestCases: true, sampleCount: 2, secretCount: 3, cases: [] }),
        ),
        http.get(`${API}/problems/p/:slug/validation`, () =>
          HttpResponse.json({ found: true, terminal: true, passed: true, stale: false, status: 'DRAFT', validationLogs: [] }),
        ),
      )
      stubEndpoint('post', '/problems/p/two-sum/publish', { body: { validationLogs: ['Caso 1 correcto', 'Caso 2 correcto'] } })
      renderAt('/problems/two-sum')

      await waitFor(() => expect(screen.getByRole('button', { name: /^publicar$/i })).not.toBeDisabled())
      await user.click(screen.getByRole('button', { name: /^publicar$/i }))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText('Detalle de la validación')).toBeInTheDocument()
      expect(within(dialog).getByText('Caso 1 correcto')).toBeInTheDocument()
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success', title: 'Problema publicado' }))
      const closeButtons = within(dialog).getAllByRole('button', { name: 'Cerrar' })
      await user.click(closeButtons[closeButtons.length - 1])
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('si la validación falla al publicar muestra el detalle: campos faltantes y mensaje', async () => {
      stubProblem('two-sum', readyDraft())
      server.use(
        http.get(`${API}/problems/p/:slug/testcases`, () =>
          HttpResponse.json({ hasTestCases: true, sampleCount: 2, secretCount: 3, cases: [] }),
        ),
        http.get(`${API}/problems/p/:slug/validation`, () =>
          HttpResponse.json({ found: true, terminal: true, passed: true, stale: false, status: 'DRAFT', validationLogs: [] }),
        ),
      )
      stubEndpoint('post', '/problems/p/two-sum/publish', {
        status: 422,
        body: { error: 'VALIDATION_FAILED', message: 'Faltan cosas', missingFields: ['statement', 'campoRaro'] },
      })
      renderAt('/problems/two-sum')

      await waitFor(() => expect(screen.getByRole('button', { name: /^publicar$/i })).not.toBeDisabled())
      await user.click(screen.getByRole('button', { name: /^publicar$/i }))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText('No se pudo publicar')).toBeInTheDocument()
      expect(within(dialog).getByText('Faltan cosas')).toBeInTheDocument()
      expect(within(dialog).getByText('Enunciado')).toBeInTheDocument()
      expect(within(dialog).getByText('campoRaro')).toBeInTheDocument()
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'No se pudo publicar' }))
    })

    it('si publicar falla por otra causa avisa del error sin abrir el detalle', async () => {
      stubProblem('two-sum', readyDraft())
      server.use(
        http.get(`${API}/problems/p/:slug/testcases`, () =>
          HttpResponse.json({ hasTestCases: true, sampleCount: 2, secretCount: 3, cases: [] }),
        ),
        http.get(`${API}/problems/p/:slug/validation`, () =>
          HttpResponse.json({ found: true, terminal: true, passed: true, stale: false, status: 'DRAFT', validationLogs: [] }),
        ),
      )
      stubEndpoint('post', '/problems/p/two-sum/publish', { status: 500, body: { error: 'INTERNAL_SERVER_ERROR' } })
      renderAt('/problems/two-sum')

      await waitFor(() => expect(screen.getByRole('button', { name: /^publicar$/i })).not.toBeDisabled())
      await user.click(screen.getByRole('button', { name: /^publicar$/i }))

      await waitFor(() =>
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al publicar' })),
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('dentro de una competencia', () => {
    const contest = {
      id: 'contest-2',
      name: 'Práctica Grafos',
      status: 'ACTIVE',
      owner: { id: 'u2', nickname: 'mariacoach' },
      group: { id: 'group-1', name: 'ICPC Colombia' },
      problems: [{ position: 1, slug: 'two-sum', title: 'Two Sum', timeLimit: 2000, memoryLimit: 256, color: null }],
    }

    it('antecede el título con la letra, oculta etiquetas y estadísticas y no muestra gestión del problema', async () => {
      contestSession.contest = contest
      renderAt('/groups/group-1/contests/contest-2/problems/a')

      expect(await screen.findByRole('heading', { name: 'A. Two Sum' })).toBeInTheDocument()
      expect(screen.queryByText('arrays')).not.toBeInTheDocument()
      expect(screen.queryByText('Estadísticas')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /más acciones/i })).not.toBeInTheDocument()
      expect(screen.queryByText('Publicado')).not.toBeInTheDocument()
      expect(screen.getByText('Problema A')).toBeInTheDocument()
    })

    it('Enviar solución va al formulario de envío de la competencia', async () => {
      contestSession.contest = contest
      renderAt('/groups/group-1/contests/contest-2/problems/a')

      await user.click(await screen.findByRole('button', { name: 'Enviar solución' }))
      expect(await screen.findByTestId('location')).toHaveTextContent('/groups/group-1/contests/contest-2/submit')
    })

    it('una letra que no existe en la competencia muestra la página no encontrada', async () => {
      contestSession.contest = contest
      renderAt('/groups/group-1/contests/contest-2/problems/z')

      expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
    })

    it('el dueño de la competencia rejuzga con el endpoint de la competencia', async () => {
      _authUser = { ...mockCurrentUser, role: 'COACH', nickname: 'mariacoach' }
      contestSession.contest = contest
      const calls = stubEndpoint('post', '/groups/group-1/contests/contest-2/problems/two-sum/rejudge', { body: { message: 'ok' } })
      renderAt('/groups/group-1/contests/contest-2/problems/a')

      await user.click(await screen.findByRole('button', { name: 'Rejuzgar envíos' }))
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rejuzgar' }))

      await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rejuzgamiento iniciado' })))
      expect(calls).toHaveLength(1)
    })

    it('un administrador que no es dueño ni líder rejuzga con el endpoint de administración y el contestId', async () => {
      contestSession.contest = { ...contest, owner: { id: 'u9', nickname: 'otro' } }
      server.use(
        http.get(`${API}/groups/group-1`, () =>
          HttpResponse.json({ id: 'group-1', name: 'ICPC Colombia', userMembership: { isMember: false, role: null }, leads: [], statistics: { memberCount: 1, leadCount: 0 } }),
        ),
      )
      const calls = stubEndpoint('post', '/admin/problems/two-sum/rejudge', { body: { message: 'ok' } })
      renderAt('/groups/group-1/contests/contest-2/problems/a')

      await user.click(await screen.findByRole('button', { name: 'Rejuzgar envíos' }))
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rejuzgar' }))

      await waitFor(() => expect(calls).toHaveLength(1))
      expect(calls[0].search).toBe('?contestId=contest-2')
    })

    it('quien no lidera la competencia no ve Rejuzgar envíos', async () => {
      _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
      contestSession.contest = contest
      server.use(
        http.get(`${API}/groups/group-1`, () =>
          HttpResponse.json({ id: 'group-1', name: 'ICPC Colombia', userMembership: { isMember: true, role: 'MEMBER' }, leads: [], statistics: { memberCount: 1, leadCount: 0 } }),
        ),
      )
      renderAt('/groups/group-1/contests/contest-2/problems/a')

      await screen.findByRole('heading', { name: 'A. Two Sum' })
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(screen.queryByRole('button', { name: 'Rejuzgar envíos' })).not.toBeInTheDocument()
    })
  })
})
