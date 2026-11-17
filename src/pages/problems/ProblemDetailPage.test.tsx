import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useEffect } from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
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
