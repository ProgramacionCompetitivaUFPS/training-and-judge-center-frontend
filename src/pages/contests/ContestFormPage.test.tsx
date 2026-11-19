import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
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

    it('lista los problemas con su color guardado y "Sin color" para el que no tiene', async () => {
      renderEdit('group-1', 'contest-2')

      expect(await screen.findByRole('heading', { name: 'Gestión de colores' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Color del problema A' })).toHaveTextContent('#e11d48')
      expect(screen.getByRole('button', { name: 'Color del problema B' })).toHaveTextContent('#2563eb')
      expect(screen.getByRole('button', { name: 'Color del problema C' })).toHaveTextContent('Sin color')
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

    it('manda color null para quitar el color de un problema que lo tenía', async () => {
      // Arrange
      const user = userEvent.setup()
      const bodies = recordPutBodies()
      renderEdit('group-1', 'contest-2')

      // Act
      await chooseColor(user, 'A', 'Quitar color')
      expect(screen.getByRole('button', { name: 'Color del problema A' })).toHaveTextContent('Sin color')
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
      })
      expect(bodies).toEqual([
        { problems: [{ slug: 'two-sum', order: 1, color: null }, { slug: 'binary-search', order: 2 }, { slug: 'graph-bfs', order: 3 }] },
      ])
    })

    it.each([
      ['se elige el mismo color guardado', 'A', '#e11d48'],
      ['se quita el color a un problema que ya no tenía', 'C', 'Quitar color'],
    ])('no manda problems si %s', async (_caso, letter, colorName) => {
      // Arrange
      const user = userEvent.setup()
      const bodies = recordPutBodies()
      renderEdit('group-1', 'contest-2')

      // Act
      await chooseColor(user, letter, colorName)
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
})
