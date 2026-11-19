import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import { useEffect } from 'react'
import { render, screen, waitFor, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { http, HttpResponse, delay } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockProblems } from '@/mocks/data'
import type { User } from '@/types/user'
import { ProblemDetailPage } from './ProblemDetailPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
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
