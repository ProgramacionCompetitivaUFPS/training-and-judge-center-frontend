import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse, delay } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockGroupDetails, mockContests } from '@/mocks/data'
import type { User } from '@/types/user'
import type { ContestDetail } from '@/types/contest'
import { ContestDetailPage } from './ContestDetailPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

// ContestCountdown uses useSyncExternalStore + setInterval which causes
// "Maximum update depth exceeded" under coverage instrumentation
vi.mock('@/components/features/ContestCountdown', () => ({
  ContestCountdown: () => null,
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

function renderPage(groupId = 'group-1', contestId = 'contest-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/contests/${contestId}`]}>
        <Routes>
          <Route path="/groups/:groupId/contests/:id" element={<ContestDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const initialContests = structuredClone(mockContests)

// Registra el body de cada PUT y devuelve undefined: MSW pasa al handler por defecto del mock.
function recordPutBodies() {
  const bodies: unknown[] = []
  server.use(
    http.put('http://localhost:8080/api/groups/:groupId/contests/:contestId', async ({ request }) => {
      bodies.push(await request.clone().json())
    }),
  )
  return bodies
}

describe('ContestDetailPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    _authUser = { ...mockCurrentUser }
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders contest name and status badge', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Competencia Semanal #12' })).toBeInTheDocument()
  })

  it('renders not-found page on 404', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
        HttpResponse.json({ error: 'CONTEST_NOT_FOUND' }, { status: 404 }),
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
    })
  })

  it('renders error page on 500', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
        HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    })
  })

  it('ADMIN sees no-participation message instead of Registrarse (SCHEDULED)', async () => {
    // contest-1 is SCHEDULED + MIXED mode; ADMIN is blocked from registering
    renderPage('group-1', 'contest-1')
    await screen.findByRole('heading', { name: 'Competencia Semanal #12' })
    expect(screen.getByText(/Los administradores no participan/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^registrarse$/i })).not.toBeInTheDocument()
  })

  it('CONTESTANT (member) sees Registrarse button for SCHEDULED contest', async () => {
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
    // Override group to return MEMBER role (default mock returns LEAD for luisadmin)
    server.use(
      http.get('http://localhost:8080/api/groups/group-1', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-1'],
          userMembership: { isMember: true, role: 'MEMBER', joinedAt: '2024-09-01T12:00:00Z' },
        }),
      ),
    )
    renderPage('group-1', 'contest-1')
    // For a MEMBER contestant, registrationBlock=null and canRegisterIndividual=true
    expect(await screen.findByRole('button', { name: /^registrarse$/i })).toBeInTheDocument()
  })

  it('group LEAD (non-admin) sees "Editar competencia" for ACTIVE contest', async () => {
    // Use COACH role so the ADMIN shortcut doesn't fire; only the membership LEAD check matters
    _authUser = { ...mockCurrentUser, role: 'COACH', nickname: 'mariacoach' }
    server.use(
      http.get('http://localhost:8080/api/groups/group-1', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-1'],
          userMembership: { isMember: true, role: 'LEAD', joinedAt: '2024-08-01T00:00:00Z' },
        }),
      ),
    )
    renderPage('group-1', 'contest-2')
    await screen.findByRole('heading', { name: 'Práctica Grafos' })
    expect(await screen.findByRole('button', { name: /editar competencia/i })).toBeInTheDocument()
  })

  it('non-LEAD CONTESTANT does not see "Editar competencia" for ACTIVE contest', async () => {
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
    server.use(
      http.get('http://localhost:8080/api/groups/group-1', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-1'],
          userMembership: { isMember: true, role: 'MEMBER', joinedAt: '2024-09-01T12:00:00Z' },
        }),
      ),
    )
    renderPage('group-1', 'contest-2')
    await screen.findByRole('heading', { name: 'Práctica Grafos' })
    expect(screen.queryByRole('button', { name: /editar competencia/i })).not.toBeInTheDocument()
  })

  it('group LEAD (non-admin) does not see "Registrar equipo" button for SCHEDULED MIXED contest', async () => {
    // contest-1 is SCHEDULED + MIXED; COACH with LEAD membership → registrationBlock='lead' → showTeamRegistration=false
    _authUser = { ...mockCurrentUser, role: 'COACH', nickname: 'mariacoach' }
    server.use(
      http.get('http://localhost:8080/api/groups/group-1', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-1'],
          userMembership: { isMember: true, role: 'LEAD', joinedAt: '2024-08-01T00:00:00Z' },
        }),
      ),
    )
    renderPage('group-1', 'contest-1')

    // Wait for the block message to confirm group membership has loaded before asserting the button
    await screen.findByText(/como líder del grupo organizas esta competencia/i)
    expect(screen.queryByRole('button', { name: /registrar equipo/i })).not.toBeInTheDocument()
  })

  it('"Registrar equipo" does not flash before group membership loads for a LEAD', async () => {
    // Verifies that groupMembershipKnown gates showTeamRegistration during the loading window.
    // If the guard were absent, the button would appear briefly while ownerGroup is undefined.
    _authUser = { ...mockCurrentUser, role: 'COACH', nickname: 'mariacoach' }
    let resolveGroup!: (v: Response) => void
    const groupPending = new Promise<Response>((res) => { resolveGroup = res })
    server.use(
      http.get('http://localhost:8080/api/groups/group-1', () => groupPending),
    )
    renderPage('group-1', 'contest-1')

    // Contest is loaded but group is still pending — button must not appear yet
    await screen.findByRole('heading', { name: 'Competencia Semanal #12' })
    expect(screen.queryByRole('button', { name: /registrar equipo/i })).not.toBeInTheDocument()

    // Now resolve the group as LEAD and confirm the button still doesn't appear
    resolveGroup(HttpResponse.json({
      ...mockGroupDetails['group-1'],
      userMembership: { isMember: true, role: 'LEAD', joinedAt: '2024-08-01T00:00:00Z' },
    }))
    await screen.findByText(/como líder del grupo organizas esta competencia/i)
    expect(screen.queryByRole('button', { name: /registrar equipo/i })).not.toBeInTheDocument()
  })

  it('shows retry message when group query fails while contest is loaded', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/group-1', () =>
        HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
      ),
    )
    renderPage('group-1', 'contest-1')

    await screen.findByRole('heading', { name: 'Competencia Semanal #12' })
    await waitFor(() => {
      expect(screen.getByText(/no se pudo cargar tu membresía/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /registrarse/i })).not.toBeInTheDocument()
  })

  it('FINISHED contest shows "Finalizado" indicator', async () => {
    // contest-3 is FINISHED; "Finalizado" appears in both the status badge and the timer area
    renderPage('group-1', 'contest-3')
    await screen.findByRole('heading', { name: 'Reto Algoritmos Clásicos' })
    expect(screen.getAllByText(/finalizado/i).length).toBeGreaterThan(0)
  })

  describe('color de los globos en la tabla de problemas', () => {
    afterEach(() => {
      mockContests.splice(0, mockContests.length, ...structuredClone(initialContests))
    })

    it('un líder cambia el color de un problema y se envía solo ese color', async () => {
      // Arrange
      const user = userEvent.setup()
      const bodies = recordPutBodies()
      renderPage('group-1', 'contest-2')

      // Act
      await user.click(await screen.findByRole('button', { name: 'Color del problema B' }))
      await user.click(await screen.findByRole('button', { name: '#7c3aed' }))

      // Assert: se espera al toast (el mock responde a los 300 ms) para no dejar el PUT en vuelo
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'success', title: 'Color guardado', description: 'Se actualizó el color del problema B' }),
        )
      })
      expect(bodies).toEqual([
        { problems: [{ slug: 'two-sum', order: 1 }, { slug: 'binary-search', order: 2, color: '#7c3aed' }, { slug: 'graph-bfs', order: 3 }] },
      ])
    })

    it('mientras se guarda un color deshabilita los globos y el botón de bloquear, sin mostrarlo como cargando', async () => {
      // Arrange: el botón de bloquear solo existe en el diseño de competencia programada, y el PUT
      // nunca responde para que el guardado quede en curso
      const user = userEvent.setup()
      const contest2 = mockContests.find((c) => c.id === 'contest-2')
      server.use(
        http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
          HttpResponse.json({ ...contest2, status: 'SCHEDULED' }),
        ),
        http.put('http://localhost:8080/api/groups/:groupId/contests/:contestId', () => delay('infinite')),
      )
      renderPage('group-1', 'contest-2')

      // Act
      await user.click(await screen.findByRole('button', { name: 'Color del problema B' }))
      await user.click(await screen.findByRole('button', { name: '#7c3aed' }))

      // Assert
      await waitFor(() => expect(screen.getByRole('button', { name: 'Color del problema A' })).toBeDisabled())
      // El nombre es exacto: si estuviera "cargando" incluiría el texto "Cargando…"
      expect(screen.getByRole('button', { name: 'Bloquear competencia' })).toBeDisabled()
    })

    it('restablecer a blanco guarda #ffffff solo para ese problema', async () => {
      // Arrange
      const user = userEvent.setup()
      const bodies = recordPutBodies()
      renderPage('group-1', 'contest-2')

      // Act
      await user.click(await screen.findByRole('button', { name: 'Color del problema A' }))
      await user.click(await screen.findByRole('button', { name: 'Restablecer a blanco' }))

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success', title: 'Color guardado' }))
      })
      expect(bodies).toEqual([
        { problems: [{ slug: 'two-sum', order: 1, color: '#ffffff' }, { slug: 'binary-search', order: 2 }, { slug: 'graph-bfs', order: 3 }] },
      ])
    })

    it('mientras se guarda un color no deja agregar un problema (evita que un PUT pise al otro)', async () => {
      // Arrange: contest-2 como programada (ahí existe el buscador) y un PUT que nunca responde
      const user = userEvent.setup()
      const contest2 = mockContests.find((c) => c.id === 'contest-2')
      const bodies: unknown[] = []
      server.use(
        http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
          HttpResponse.json({ ...contest2, status: 'SCHEDULED' }),
        ),
        http.put('http://localhost:8080/api/groups/:groupId/contests/:contestId', async ({ request }) => {
          bodies.push(await request.clone().json())
          return delay('infinite')
        }),
      )
      renderPage('group-1', 'contest-2')
      const search = await screen.findByPlaceholderText('Buscar problema publicado por título...')

      // Act
      await user.click(await screen.findByRole('button', { name: 'Color del problema B' }))
      await user.click(await screen.findByRole('button', { name: '#7c3aed' }))

      // Assert
      await waitFor(() => expect(search).toBeDisabled())
      expect(bodies).toHaveLength(1)
    })

    it('ante CONTEST_CONFLICT avisa y recarga el contest con los datos nuevos', async () => {
      // Arrange
      const user = userEvent.setup()
      const contest2 = mockContests.find((c) => c.id === 'contest-2')
      let getCalls = 0
      server.use(
        http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () => {
          getCalls += 1
          // 1.ª carga: handler por defecto. Recarga tras el conflicto: otra persona cambió el color de A.
          if (getCalls === 1) return undefined
          return HttpResponse.json({
            ...contest2,
            problems: contest2?.problems.map((p) => (p.slug === 'two-sum' ? { ...p, color: '#abcdef' } : p)),
          })
        }),
        http.put('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
          HttpResponse.json({ error: 'CONTEST_CONFLICT', message: 'x' }, { status: 409 }),
        ),
      )
      renderPage('group-1', 'contest-2')

      // Act
      await user.click(await screen.findByRole('button', { name: 'Color del problema B' }))
      await user.click(await screen.findByRole('button', { name: '#7c3aed' }))

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'error',
            title: 'No se pudo guardar el color',
            description: 'Alguien más modificó esta competencia al mismo tiempo. Recarga e inténtalo de nuevo',
          }),
        )
      })
      await waitFor(() => {
        const balloonA = within(screen.getByRole('button', { name: 'Color del problema A' })).getByTestId('balloon-icon-body')
        expect(balloonA).toHaveAttribute('fill', '#abcdef')
      })
    })

    it('en una competencia finalizada los globos se ven pero no se pueden editar', async () => {
      renderPage('group-1', 'contest-3')

      expect(await screen.findByRole('img', { name: 'Problema A' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Color del problema A' })).not.toBeInTheDocument()
    })

    it('un miembro que no lidera el grupo ve los globos sin poder editarlos', async () => {
      _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
      server.use(
        http.get('http://localhost:8080/api/groups/group-1', () =>
          HttpResponse.json({
            ...mockGroupDetails['group-1'],
            userMembership: { isMember: true, role: 'MEMBER', joinedAt: '2024-09-01T12:00:00Z' },
          }),
        ),
      )
      renderPage('group-1', 'contest-2')

      expect(await screen.findByRole('img', { name: 'Problema A' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Color del problema A' })).not.toBeInTheDocument()
    })
  })

  describe('gestión de problemas y borrado', () => {
    afterEach(() => {
      mockContests.splice(0, mockContests.length, ...structuredClone(initialContests))
    })

    it('agrega cada problema nuevo en blanco sin tocar el color de los demás, y al quitar no manda color', async () => {
      // Arrange
      const user = userEvent.setup()
      const bodies = recordPutBodies()
      renderPage('group-1', 'contest-1')
      const search = await screen.findByPlaceholderText('Buscar problema publicado por título...')

      // Act
      await user.type(search, 'Two Sum')
      await user.click(await screen.findByRole('button', { name: /two-sum/ }))
      // El PUT del mock tarda 300 ms: hay que esperar al EFECTO (caché actualizada → aparece el botón Remover),
      // no solo a que el body se registre; si no, el siguiente paso arma su payload con la lista vieja.
      await screen.findByRole('button', { name: 'Remover Two Sum' })
      await user.type(screen.getByPlaceholderText('Buscar problema publicado por título...'), 'Binary Search')
      await user.click(await screen.findByRole('button', { name: /binary-search/ }))
      await screen.findByRole('button', { name: 'Remover Binary Search' })
      await user.click(screen.getByRole('button', { name: 'Remover Two Sum' }))
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Problema removido' }))
      })

      // Assert
      expect(bodies).toEqual([
        { problems: [{ slug: 'two-sum', order: 1, color: '#ffffff' }] },
        { problems: [{ slug: 'two-sum', order: 1 }, { slug: 'binary-search', order: 2, color: '#ffffff' }] },
        { problems: [{ slug: 'binary-search', order: 1 }] },
      ])
    })

    it.each([
      [403, 'CONTEST_LOCKED', 'Esta competencia está bloqueada y no se puede modificar'],
      [409, 'CONTEST_IS_ACTIVE', 'No se puede eliminar una competencia activa'],
      [404, 'CONTEST_NOT_FOUND', 'Competencia no encontrada'],
    ])('al fallar el borrado con %i %s muestra el mensaje en español', async (status, code, description) => {
      // Arrange
      const user = userEvent.setup()
      server.use(
        http.delete('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
          HttpResponse.json({ error: code, message: 'x' }, { status }),
        ),
      )
      renderPage('group-1', 'contest-1')

      // Act
      await user.click(await screen.findByRole('button', { name: 'Eliminar competencia' }))
      await user.type(screen.getByPlaceholderText('Nombre de la competencia'), 'Competencia Semanal #12')
      await user.click(screen.getByRole('button', { name: 'Eliminar' }))

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', description }))
      })
      expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Eliminado' }))
    })
  })

  it('pide los standings solo de la fase oficial', async () => {
    // Arrange
    const phases: (string | null)[] = []
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId/standings', ({ request }) => {
        phases.push(new URL(request.url).searchParams.get('phase'))
      }),
    )

    // Act
    renderPage('group-1', 'contest-2')
    await screen.findByRole('heading', { name: 'Práctica Grafos' })

    // Assert
    await waitFor(() => expect(phases[0]).toBe('competition'))
  })

  describe('inscripción tardía', () => {
    beforeEach(() => {
      mockContests.splice(0, mockContests.length, ...structuredClone(initialContests))
    })
    afterEach(() => {
      mockContests.splice(0, mockContests.length, ...structuredClone(initialContests))
    })

    function patchContest(id: string, overrides: Partial<ContestDetail>) {
      const contest = mockContests.find((c) => c.id === id)
      if (!contest) throw new Error(`${id} missing from mocks`)
      Object.assign(contest, overrides)
    }

    function useMemberGroup() {
      _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
      server.use(
        http.get('http://localhost:8080/api/groups/group-1', () =>
          HttpResponse.json({
            ...mockGroupDetails['group-1'],
            userMembership: { isMember: true, role: 'MEMBER', joinedAt: '2024-09-01T12:00:00Z' },
          }),
        ),
      )
    }

    it('ACTIVE con flag: muestra Registrarse y el aviso antes de inscribir', async () => {
      // Arrange
      const user = userEvent.setup()
      useMemberGroup()
      patchContest('contest-2', { isRegistered: false, participationMode: 'INDIVIDUAL', allowLateRegistration: true })
      renderPage('group-1', 'contest-2')

      // Act
      await user.click(await screen.findByRole('button', { name: /^registrarse$/i }))

      // Assert
      expect(within(screen.getByRole('dialog')).getByText('Inscripción tardía')).toBeInTheDocument()
      expect(mockToast).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: 'Inscribirme' }))
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success', title: 'Registrado' }))
      })
    })

    it('SCHEDULED que ya alcanzó su inicio con flag: el mock lo devuelve ACTIVE y pide el aviso', async () => {
      // Arrange
      const user = userEvent.setup()
      useMemberGroup()
      patchContest('contest-1', {
        startTime: new Date(Date.now() - 60_000).toISOString(),
        endTime: new Date(Date.now() + 3_600_000).toISOString(),
        participationMode: 'INDIVIDUAL',
        allowLateRegistration: true,
      })
      renderPage('group-1', 'contest-1')

      // Act
      await user.click(await screen.findByRole('button', { name: /^registrarse$/i }))

      // Assert
      expect(within(screen.getByRole('dialog')).getByText('Inscripción tardía')).toBeInTheDocument()
    })

    it('con el detalle aún en SCHEDULED pero ya iniciado y con flag, pide el aviso antes de inscribir', async () => {
      // Arrange: respuesta desactualizada del backend (el contador llegó a startTime antes del refetch)
      const user = userEvent.setup()
      useMemberGroup()
      let registerCalls = 0
      const scheduledButStarted = {
        ...mockContests.find((c) => c.id === 'contest-1')!,
        startTime: new Date(Date.now() - 60_000).toISOString(),
        endTime: new Date(Date.now() + 3_600_000).toISOString(),
        participationMode: 'INDIVIDUAL',
        allowLateRegistration: true,
      }
      server.use(
        http.get('http://localhost:8080/api/groups/group-1/contests/contest-1', () => HttpResponse.json(scheduledButStarted)),
        http.post('http://localhost:8080/api/groups/:groupId/contests/:contestId/register', () => {
          registerCalls += 1
          return new HttpResponse(null, { status: 204 })
        }),
      )
      renderPage('group-1', 'contest-1')

      // Act
      await user.click(await screen.findByRole('button', { name: /^registrarse$/i }))

      // Assert
      expect(within(screen.getByRole('dialog')).getByText('Inscripción tardía')).toBeInTheDocument()
      expect(registerCalls).toBe(0)
    })

    it('ACTIVE con flag y sin problemas visibles: pide inscribirse en vez de exigir haberse registrado antes', async () => {
      // Arrange
      useMemberGroup()
      patchContest('contest-2', { isRegistered: false, participationMode: 'INDIVIDUAL', allowLateRegistration: true, problems: [] })

      // Act
      renderPage('group-1', 'contest-2')

      // Assert
      expect(await screen.findByText('Inscríbete para acceder a los problemas de la competencia.')).toBeInTheDocument()
      expect(screen.queryByText(/Debiste haberte registrado antes/)).not.toBeInTheDocument()
    })

    it('ACTIVE con flag: cancelar el aviso no inscribe', async () => {
      // Arrange
      const user = userEvent.setup()
      useMemberGroup()
      let registerCalls = 0
      server.use(
        http.post('http://localhost:8080/api/groups/:groupId/contests/:contestId/register', () => {
          registerCalls += 1
          return new HttpResponse(null, { status: 204 })
        }),
      )
      patchContest('contest-2', { isRegistered: false, participationMode: 'INDIVIDUAL', allowLateRegistration: true })
      renderPage('group-1', 'contest-2')

      // Act
      await user.click(await screen.findByRole('button', { name: /^registrarse$/i }))
      await user.click(screen.getByRole('button', { name: 'Cancelar' }))

      // Assert
      expect(registerCalls).toBe(0)
    })

    it('ACTIVE sin flag: no muestra ningún botón de inscripción', async () => {
      // Arrange
      useMemberGroup()
      patchContest('contest-2', { isRegistered: false, participationMode: 'INDIVIDUAL', allowLateRegistration: false })

      // Act
      renderPage('group-1', 'contest-2')
      await screen.findByRole('heading', { name: 'Práctica Grafos' })

      // Assert
      expect(screen.queryByRole('button', { name: /^registrarse$/i })).not.toBeInTheDocument()
    })

    it('ACTIVE con flag, ya inscrita: no muestra Registrarse ni Cancelar registro', async () => {
      // Arrange
      useMemberGroup()
      patchContest('contest-2', { isRegistered: true, participationMode: 'INDIVIDUAL', allowLateRegistration: true })

      // Act
      renderPage('group-1', 'contest-2')
      await screen.findByRole('heading', { name: 'Práctica Grafos' })

      // Assert
      expect(screen.queryByRole('button', { name: /^registrarse$/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cancelar registro' })).not.toBeInTheDocument()
    })

    it('FINISHED con flag: no muestra Registrarse', async () => {
      // Arrange
      useMemberGroup()
      patchContest('contest-3', { allowLateRegistration: true, isRegistered: false })

      // Act
      renderPage('group-1', 'contest-3')
      await screen.findByRole('heading', { name: 'Reto Algoritmos Clásicos' })

      // Assert
      expect(screen.queryByRole('button', { name: /^registrarse$/i })).not.toBeInTheDocument()
    })

    it('SCHEDULED: Registrarse inscribe directo, sin aviso', async () => {
      // Arrange
      const user = userEvent.setup()
      useMemberGroup()
      renderPage('group-1', 'contest-1')

      // Act
      await user.click(await screen.findByRole('button', { name: /^registrarse$/i }))

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success', title: 'Registrado' }))
      })
      expect(screen.queryByText('Inscripción tardía')).not.toBeInTheDocument()
    })

    it.each([
      ['CONTEST_ALREADY_STARTED', 'La inscripción está cerrada porque la competencia ya inició'],
      ['CONTEST_NOT_OPEN_FOR_REGISTRATION', 'La competencia ya terminó, la inscripción está cerrada'],
    ])('si el backend responde 409 %s muestra el mensaje mapeado por código', async (code, description) => {
      // Arrange: la página cargó como programada, pero el backend ya cerró la inscripción
      const user = userEvent.setup()
      useMemberGroup()
      server.use(
        http.post('http://localhost:8080/api/groups/:groupId/contests/:contestId/register', () =>
          HttpResponse.json({ error: code, message: 'x' }, { status: 409 }),
        ),
      )
      renderPage('group-1', 'contest-1')

      // Act
      await user.click(await screen.findByRole('button', { name: /^registrarse$/i }))

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', description }))
      })
    })

    it('muestra la fila Inscripción tardía habilitada en SCHEDULED', async () => {
      // Arrange
      patchContest('contest-1', { allowLateRegistration: true })

      // Act
      renderPage('group-1', 'contest-1')

      // Assert
      expect(await screen.findByText('Inscripción tardía habilitada')).toBeInTheDocument()
    })
  })
})
