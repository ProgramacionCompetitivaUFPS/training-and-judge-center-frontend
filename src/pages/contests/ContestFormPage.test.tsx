import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse, delay } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockContests } from '@/mocks/data'
import { ContestFormPage } from './ContestFormPage'

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

function renderCreate(groupId = 'group-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/contests/new`]}>
        <Routes>
          <Route path="/groups/:groupId/contests/new" element={<ContestFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderEdit(groupId = 'group-1', contestId = 'contest-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/contests/${contestId}/edit`]}>
        <Routes>
          <Route path="/groups/:groupId/contests/:id/edit" element={<ContestFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const initialContests = structuredClone(mockContests)

// Registra el body de cada PUT y devuelve undefined: MSW pasa al handler por defecto,
// que aplica las reglas reales del mock (y muta mockContests, ver beforeEach del describe).
function recordPutBodies() {
  const bodies: unknown[] = []
  server.use(
    http.put('http://localhost:8080/api/groups/:groupId/contests/:contestId', async ({ request }) => {
      bodies.push(await request.clone().json())
    }),
  )
  return bodies
}

// Registra el body de cada POST de creación y devuelve undefined para que aplique el handler por defecto.
function recordPostBodies() {
  const bodies: unknown[] = []
  server.use(
    http.post('http://localhost:8080/api/groups/:groupId/contests', async ({ request }) => {
      bodies.push(await request.clone().json())
    }),
  )
  return bodies
}

describe('ContestFormPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders name field and submit button in create mode', async () => {
    renderCreate()
    expect(await screen.findByRole('textbox', { name: /nombre/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /crear|guardar/i })).toBeInTheDocument()
  })

  it('pre-fills name in edit mode', async () => {
    renderEdit()
    expect(await screen.findByDisplayValue('Competencia Semanal #12')).toBeInTheDocument()
  })

  it('shows validation error on empty name submit', async () => {
    const user = userEvent.setup()
    renderCreate()
    await user.click(await screen.findByRole('button', { name: /crear|guardar/i }))
    expect(await screen.findByText('El nombre es requerido')).toBeInTheDocument()
  })

  it('shows success toast after creating a contest', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.type(await screen.findByRole('textbox', { name: /nombre/i }), 'Mi Competencia Test')

    // datetime-local: userEvent v14 does not support these inputs reliably (§13b exception)
    // fireEvent.change is used intentionally here
    fireEvent.change(screen.getByLabelText(/fecha y hora de inicio/i), {
      target: { value: '2027-06-01T10:00' },
    })
    fireEvent.change(screen.getByLabelText(/fecha y hora de fin/i), {
      target: { value: '2027-06-01T12:00' },
    })

    await user.click(screen.getByRole('button', { name: /crear|guardar/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Creado' }))
    })
  })

  describe('gestión de colores', () => {
    beforeEach(() => {
      mockContests.splice(0, mockContests.length, ...structuredClone(initialContests))
    })

    async function chooseColor(user: ReturnType<typeof userEvent.setup>, letter: string, colorName: string) {
      await user.click(await screen.findByRole('button', { name: `Color del problema ${letter}` }))
      await user.click(await screen.findByRole('button', { name: colorName }))
    }

    it('lista los problemas con su color guardado y blanco para el que no tiene', async () => {
      renderEdit('group-1', 'contest-2')

      expect(await screen.findByRole('heading', { name: 'Gestión de colores' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Color del problema A' })).toHaveTextContent('#e11d48')
      expect(screen.getByRole('button', { name: 'Color del problema B' })).toHaveTextContent('#2563eb')
      expect(screen.getByRole('button', { name: 'Color del problema C' })).toHaveTextContent('#ffffff')
      expect(screen.getByRole('button', { name: 'Color del problema A' })).toBeEnabled()
      expect(screen.getByText('B. Binary Search', { exact: false })).toBeInTheDocument()
    })

    it('no muestra la sección al crear una competencia', async () => {
      renderCreate()

      await screen.findByRole('textbox', { name: /nombre/i })

      expect(screen.queryByRole('heading', { name: 'Gestión de colores' })).not.toBeInTheDocument()
    })

    it('no muestra la sección cuando la competencia no tiene problemas', async () => {
      renderEdit('group-1', 'contest-1')

      await screen.findByDisplayValue('Competencia Semanal #12')

      expect(screen.queryByRole('heading', { name: 'Gestión de colores' })).not.toBeInTheDocument()
    })

    it('manda color solo en el problema cambiado y omite la clave en los demás', async () => {
      // Arrange
      const user = userEvent.setup()
      const bodies = recordPutBodies()
      renderEdit('group-1', 'contest-2')

      // Act
      await chooseColor(user, 'A', '#7c3aed')
      expect(screen.getByRole('button', { name: 'Color del problema A' })).toHaveTextContent('#7c3aed')
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      // Assert: el toast llega cuando responde el mock (300 ms); esperarlo evita dejar el PUT en vuelo
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
      })
      expect(bodies).toEqual([
        { problems: [{ slug: 'two-sum', order: 1, color: '#7c3aed' }, { slug: 'binary-search', order: 2 }, { slug: 'graph-bfs', order: 3 }] },
      ])
    })

    it.each([
      ['restablece a blanco un problema que tenía color', 'A', 'two-sum', 1],
      ['guarda el blanco en un problema que no tenía color', 'C', 'graph-bfs', 3],
    ])('%s', async (_caso, letter, slug, order) => {
      // Arrange
      const user = userEvent.setup()
      const bodies = recordPutBodies()
      renderEdit('group-1', 'contest-2')

      // Act
      await chooseColor(user, letter, 'Restablecer a blanco')
      expect(screen.getByRole('button', { name: `Color del problema ${letter}` })).toHaveTextContent('#ffffff')
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
      })
      const sent = (bodies[0] as { problems: { slug: string; order: number; color?: string }[] }).problems
      expect(sent.find((p) => p.slug === slug)).toEqual({ slug, order, color: '#ffffff' })
      expect(sent.filter((p) => 'color' in p)).toHaveLength(1)
    })

    it('no manda problems si se elige el mismo color guardado', async () => {
      // Arrange
      const user = userEvent.setup()
      const bodies = recordPutBodies()
      renderEdit('group-1', 'contest-2')

      // Act
      await chooseColor(user, 'A', '#e11d48')
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      // Assert: al no haber cambios el formulario navega fuera sin llamar al PUT
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
      })
      expect(bodies).toEqual([])
    })

    it.each([
      ['CONTEST_PROBLEMS_LOCKED', 409, 'No se pueden cambiar los problemas de una competencia finalizada'],
      ['INVALID_PROBLEM_COLOR', 400, 'El color del problema no es válido'],
    ])('muestra el mensaje en español cuando el backend responde %s', async (code, status, description) => {
      // Arrange
      const user = userEvent.setup()
      server.use(
        http.put('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
          HttpResponse.json({ error: code, message: 'x' }, { status }),
        ),
      )
      renderEdit('group-1', 'contest-2')

      // Act
      await chooseColor(user, 'A', '#7c3aed')
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', description }))
      })
    })

    it('ante CONTEST_CONFLICT avisa, recarga el contest y conserva los colores elegidos', async () => {
      // Arrange
      const user = userEvent.setup()
      const contest2 = mockContests.find((c) => c.id === 'contest-2')
      let getCalls = 0
      server.use(
        http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () => {
          getCalls += 1
          // 1.ª carga: handler por defecto. Recarga tras el conflicto: otra persona cambió el color de B.
          if (getCalls === 1) return undefined
          return HttpResponse.json({
            ...contest2,
            problems: contest2?.problems.map((p) => (p.slug === 'binary-search' ? { ...p, color: '#abcdef' } : p)),
          })
        }),
        http.put('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
          HttpResponse.json({ error: 'CONTEST_CONFLICT', message: 'x' }, { status: 409 }),
        ),
      )
      renderEdit('group-1', 'contest-2')
      await chooseColor(user, 'A', '#7c3aed')

      // Act
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      // Assert: la recarga ya llegó (B muestra el color nuevo del servidor) y A conserva lo elegido
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'La competencia cambió' }))
      })
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Color del problema B' })).toHaveTextContent('#abcdef')
      })
      expect(screen.getByRole('button', { name: 'Color del problema A' })).toHaveTextContent('#7c3aed')
    })

    // Primer PUT: CONTEST_CONFLICT. Los siguientes pasan al handler por defecto. Registra todos los bodies.
    function conflictOnFirstPut() {
      const bodies: unknown[] = []
      server.use(
        http.put('http://localhost:8080/api/groups/:groupId/contests/:contestId', async ({ request }) => {
          bodies.push(await request.clone().json())
          if (bodies.length === 1) return HttpResponse.json({ error: 'CONTEST_CONFLICT', message: 'x' }, { status: 409 })
          return undefined
        }),
      )
      return bodies
    }

    // Primer GET: handler por defecto. Los siguientes (recarga tras el conflicto) devuelven `reloaded`.
    function reloadAfterFirstGet(reloaded: (base: NonNullable<ReturnType<typeof mockContests.find>>) => object) {
      const base = mockContests.find((c) => c.id === 'contest-2')
      let getCalls = 0
      server.use(
        http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () => {
          getCalls += 1
          if (getCalls === 1 || !base) return undefined
          return HttpResponse.json(reloaded(base))
        }),
      )
    }

    it('al recargar tras un conflicto conserva el campo que la usuaria editó y actualiza los demás', async () => {
      // Arrange
      const user = userEvent.setup()
      conflictOnFirstPut()
      reloadAfterFirstGet((base) => ({ ...base, penalty: 35 }))
      renderEdit('group-1', 'contest-2')
      const name = await screen.findByRole('textbox', { name: /nombre/i })

      // Act
      await user.clear(name)
      await user.type(name, 'Nuevo nombre')
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'La competencia cambió' }))
      })
      await waitFor(() => expect(screen.getByLabelText(/penalización/i)).toHaveValue(35))
      expect(screen.getByRole('textbox', { name: /nombre/i })).toHaveValue('Nuevo nombre')
    })

    it('si tras un conflicto la competencia ya finalizó, no reenvía los colores pero sí los demás cambios', async () => {
      // Arrange
      const user = userEvent.setup()
      const bodies = conflictOnFirstPut()
      reloadAfterFirstGet((base) => ({ ...base, status: 'FINISHED' }))
      renderEdit('group-1', 'contest-2')
      await chooseColor(user, 'A', '#7c3aed')
      const name = screen.getByRole('textbox', { name: /nombre/i })
      await user.clear(name)
      await user.type(name, 'Nuevo nombre')
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Color del problema A' })).toBeDisabled())

      // Act
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      // Assert
      await waitFor(() => expect(bodies).toHaveLength(2))
      expect(bodies[1]).toEqual({ name: 'Nuevo nombre' })
    })

    it('elegir el color ya guardado descarta la selección para no pisar un cambio ajeno tras un conflicto', async () => {
      // Arrange
      const user = userEvent.setup()
      const bodies = conflictOnFirstPut()
      reloadAfterFirstGet((base) => ({
        ...base,
        problems: base.problems.map((p) => (p.slug === 'two-sum' ? { ...p, color: '#abcdef' } : p)),
      }))
      renderEdit('group-1', 'contest-2')
      await chooseColor(user, 'A', '#e11d48')
      await chooseColor(user, 'B', '#7c3aed')
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Color del problema A' })).toHaveTextContent('#abcdef')
      })

      // Act
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      // Assert: el reintento solo cambia B; el color de A (cambiado por otra persona) no se toca
      await waitFor(() => expect(bodies).toHaveLength(2))
      expect(bodies[1]).toEqual({
        problems: [{ slug: 'two-sum', order: 1 }, { slug: 'binary-search', order: 2, color: '#7c3aed' }, { slug: 'graph-bfs', order: 3 }],
      })
    })

    it('mientras se guarda deshabilita los selectores de color', async () => {
      // Arrange: el PUT nunca responde para que el guardado quede en curso
      const user = userEvent.setup()
      server.use(
        http.put('http://localhost:8080/api/groups/:groupId/contests/:contestId', () => delay('infinite')),
      )
      renderEdit('group-1', 'contest-2')
      await chooseColor(user, 'A', '#7c3aed')

      // Act
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      // Assert
      await waitFor(() => expect(screen.getByRole('button', { name: 'Color del problema B' })).toBeDisabled())
    })

    it('deshabilita los colores y pide desbloquear cuando la competencia está bloqueada sin haber finalizado', async () => {
      const contest2 = mockContests.find((c) => c.id === 'contest-2')
      server.use(
        http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
          HttpResponse.json({ ...contest2, locked: true }),
        ),
      )
      renderEdit('group-1', 'contest-2')

      expect(await screen.findByRole('heading', { name: 'Gestión de colores' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Color del problema A' })).toBeDisabled()
      expect(
        screen.getByText('La competencia está bloqueada: desbloquéala para cambiar los colores de los globos.'),
      ).toBeInTheDocument()
    })

    it('deshabilita los colores y explica por qué en una competencia finalizada', async () => {
      renderEdit('group-1', 'contest-3')

      expect(await screen.findByRole('heading', { name: 'Gestión de colores' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Color del problema A' })).toBeDisabled()
      expect(
        screen.getByText('No se pueden cambiar los problemas de una competencia finalizada, por eso tampoco sus colores.'),
      ).toBeInTheDocument()
    })
  })

  describe('inscripción tardía', () => {
    beforeEach(() => {
      mockContests.splice(0, mockContests.length, ...structuredClone(initialContests))
    })

    async function fillCreateForm(user: ReturnType<typeof userEvent.setup>) {
      await user.type(await screen.findByRole('textbox', { name: /nombre/i }), 'Mi Competencia Test')
      // datetime-local: userEvent no maneja bien estos inputs (excepción de TESTING_STANDARDS §13b)
      fireEvent.change(screen.getByLabelText(/fecha y hora de inicio/i), { target: { value: '2027-06-01T10:00' } })
      fireEvent.change(screen.getByLabelText(/fecha y hora de fin/i), { target: { value: '2027-06-01T12:00' } })
    }

    it('envía allowLateRegistration en true al crear con el checkbox marcado', async () => {
      // Arrange
      const user = userEvent.setup()
      const bodies = recordPostBodies()
      renderCreate()
      await fillCreateForm(user)

      // Act
      await user.click(screen.getByRole('checkbox', { name: /permitir inscripción tardía/i }))
      await user.click(screen.getByRole('button', { name: 'Crear competencia' }))

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Creado' }))
      })
      expect(bodies[0]).toMatchObject({ allowLateRegistration: true })
    })

    it('envía allowLateRegistration en false por defecto al crear', async () => {
      // Arrange
      const user = userEvent.setup()
      const bodies = recordPostBodies()
      renderCreate()
      await fillCreateForm(user)

      // Act
      await user.click(screen.getByRole('button', { name: 'Crear competencia' }))

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Creado' }))
      })
      expect(bodies[0]).toMatchObject({ allowLateRegistration: false })
    })

    it('carga el valor guardado al editar', async () => {
      // Arrange
      const contest2 = mockContests.find((c) => c.id === 'contest-2')
      if (!contest2) throw new Error('contest-2 missing from mocks')
      Object.assign(contest2, { allowLateRegistration: true })

      // Act
      renderEdit('group-1', 'contest-2')

      // Assert
      expect(await screen.findByRole('checkbox', { name: /permitir inscripción tardía/i })).toBeChecked()
    })

    it('permite activarlo con la competencia en curso y manda solo ese campo', async () => {
      // Arrange
      const user = userEvent.setup()
      const bodies = recordPutBodies()
      renderEdit('group-1', 'contest-2')
      const checkbox = await screen.findByRole('checkbox', { name: /permitir inscripción tardía/i })
      expect(checkbox).toBeEnabled()

      // Act
      await user.click(checkbox)
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
      })
      expect(bodies).toEqual([{ allowLateRegistration: true }])
    })

    it('queda deshabilitado en una competencia finalizada y explica por qué', async () => {
      renderEdit('group-1', 'contest-3')

      expect(await screen.findByRole('checkbox', { name: /permitir inscripción tardía/i })).toBeDisabled()
      expect(screen.getByText('La competencia ya finalizó: la inscripción tardía no aplica.')).toBeInTheDocument()
    })
  })

  describe('revelado automático', () => {
    beforeEach(() => {
      mockContests.splice(0, mockContests.length, ...structuredClone(initialContests))
    })

    async function fillCreateForm(user: ReturnType<typeof userEvent.setup>, freeze: string) {
      await user.type(await screen.findByRole('textbox', { name: /nombre/i }), 'Mi Competencia Test')
      // datetime-local: userEvent no maneja bien estos inputs (excepción de TESTING_STANDARDS §13b)
      fireEvent.change(screen.getByLabelText(/fecha y hora de inicio/i), { target: { value: '2027-06-01T10:00' } })
      fireEvent.change(screen.getByLabelText(/fecha y hora de fin/i), { target: { value: '2027-06-01T12:00' } })
      // Las fechas auto-rellenan el freeze mientras no se haya tocado: se escribe después.
      const freezeInput = screen.getByLabelText(/freeze \(minutos antes del fin\)/i)
      await user.clear(freezeInput)
      await user.type(freezeInput, freeze)
    }

    it('no muestra el revelado cuando el freeze es 0', async () => {
      renderCreate()

      expect(await screen.findByRole('textbox', { name: /nombre/i })).toBeInTheDocument()
      expect(screen.queryByRole('radio', { name: 'Solo manualmente' })).not.toBeInTheDocument()
    })

    it('muestra el revelado en modo manual al poner un freeze mayor que 0', async () => {
      const user = userEvent.setup()
      renderCreate()

      await fillCreateForm(user, '30')

      expect(screen.getByRole('radio', { name: 'Solo manualmente' })).toBeChecked()
    })

    it('no envía autoRevealMinutes ni los campos de UI al crear en modo manual', async () => {
      const user = userEvent.setup()
      const bodies = recordPostBodies()
      renderCreate()
      await fillCreateForm(user, '30')

      await user.click(screen.getByRole('button', { name: 'Crear competencia' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Creado' }))
      })
      expect(bodies[0]).not.toHaveProperty('autoRevealMinutes')
      expect(bodies[0]).not.toHaveProperty('autoRevealMode')
      expect(bodies[0]).not.toHaveProperty('autoRevealDelay')
    })

    it.each([
      ['Al terminar la competencia', 0, null],
      ['Minutos después del fin', 45, '45'],
    ] as const)('al crear con «%s» envía autoRevealMinutes %s', async (label, expected, delayText) => {
      const user = userEvent.setup()
      const bodies = recordPostBodies()
      renderCreate()
      await fillCreateForm(user, '30')

      await user.click(screen.getByRole('radio', { name: label }))
      if (delayText) await user.type(screen.getByLabelText('Minutos de espera'), delayText)
      await user.click(screen.getByRole('button', { name: 'Crear competencia' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Creado' }))
      })
      expect(bodies[0]).toMatchObject({ autoRevealMinutes: expected })
      expect(bodies[0]).not.toHaveProperty('autoRevealMode')
      expect(bodies[0]).not.toHaveProperty('autoRevealDelay')
    })

    it('guarda aunque el modo minutos quede vacío si el freeze se baja a 0 (el campo se oculta)', async () => {
      // Arrange
      const user = userEvent.setup()
      const bodies = recordPostBodies()
      renderCreate()
      await fillCreateForm(user, '30')
      await user.click(screen.getByRole('radio', { name: 'Minutos después del fin' }))
      const freezeInput = screen.getByLabelText(/freeze \(minutos antes del fin\)/i)

      // Act
      await user.clear(freezeInput)
      await user.type(freezeInput, '0')
      await user.click(screen.getByRole('button', { name: 'Crear competencia' }))

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Creado' }))
      })
      expect(bodies[0]).not.toHaveProperty('autoRevealMinutes')
    })

    it('con un freeze negativo solo marca el error del freeze y no el de los minutos de espera', async () => {
      // Arrange
      const user = userEvent.setup()
      const bodies = recordPostBodies()
      renderCreate()
      await fillCreateForm(user, '30')
      await user.click(screen.getByRole('radio', { name: 'Minutos después del fin' }))
      const freezeInput = screen.getByLabelText(/freeze \(minutos antes del fin\)/i)

      // Act
      await user.clear(freezeInput)
      await user.type(freezeInput, '-5')
      await user.click(screen.getByRole('button', { name: 'Crear competencia' }))

      // Assert
      expect(await screen.findByText('Los minutos de freeze deben ser positivos')).toBeInTheDocument()
      expect(screen.queryByText('Ingresa los minutos de espera (entero, mínimo 1)')).not.toBeInTheDocument()
      expect(bodies).toHaveLength(0)
    })

    it('en modo minutos sin minutos muestra el error y no envía', async () => {
      const user = userEvent.setup()
      const bodies = recordPostBodies()
      renderCreate()
      await fillCreateForm(user, '30')

      await user.click(screen.getByRole('radio', { name: 'Minutos después del fin' }))
      await user.click(screen.getByRole('button', { name: 'Crear competencia' }))

      expect(await screen.findByText('Ingresa los minutos de espera (entero, mínimo 1)')).toBeInTheDocument()
      expect(bodies).toEqual([])
    })

    it('carga el modo guardado al editar', async () => {
      const contest = mockContests.find((c) => c.id === 'contest-2')
      if (!contest) throw new Error('contest-2 no existe en el mock')
      contest.autoRevealMinutes = 30

      renderEdit('group-1', 'contest-2')

      expect(await screen.findByRole('radio', { name: 'Minutos después del fin' })).toBeChecked()
      expect(screen.getByLabelText('Minutos de espera')).toHaveValue(30)
    })

    it('volver a manual al editar envía null explícito', async () => {
      const user = userEvent.setup()
      const contest = mockContests.find((c) => c.id === 'contest-2')
      if (!contest) throw new Error('contest-2 no existe en el mock')
      contest.autoRevealMinutes = 30
      const bodies = recordPutBodies()
      renderEdit('group-1', 'contest-2')
      await user.click(await screen.findByRole('radio', { name: 'Solo manualmente' }))

      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      await waitFor(() => expect(bodies).toHaveLength(1))
      expect(bodies).toEqual([{ autoRevealMinutes: null }])
    })

    it('no envía autoRevealMinutes si no se toca al editar', async () => {
      const user = userEvent.setup()
      const contest = mockContests.find((c) => c.id === 'contest-2')
      if (!contest) throw new Error('contest-2 no existe en el mock')
      contest.autoRevealMinutes = 30
      const bodies = recordPutBodies()
      renderEdit('group-1', 'contest-2')
      await user.type(await screen.findByRole('textbox', { name: /nombre/i }), ' editado')

      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      await waitFor(() => expect(bodies).toHaveLength(1))
      expect(bodies[0]).not.toHaveProperty('autoRevealMinutes')
    })
  })
})
