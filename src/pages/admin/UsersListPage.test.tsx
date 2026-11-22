import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { stubEndpoint } from '@/test/hookHarness'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { UsersListPage } from './UsersListPage'

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

function renderPage() {
  renderWithProviders(<UsersListPage />)
}

describe('UsersListPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders user list with nicknames', async () => {
    renderPage()
    expect(await screen.findByText('@diegomartinez')).toBeInTheDocument()
    expect(screen.getByText('@mariacoach')).toBeInTheDocument()
  })

  it('renders role badges', async () => {
    renderPage()
    await screen.findByText('@diegomartinez')
    expect(screen.getAllByText(/admin|coach|contestant/i).length).toBeGreaterThan(0)
  })

  it('filters results after typing in search', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('@diegomartinez')
    const searchInput = screen.getAllByRole('textbox')[0]
    await user.type(searchInput, 'carlos')
    await waitFor(() => {
      expect(screen.getByText('@carloscp')).toBeInTheDocument()
    })
  })

  it('shows error state on server failure', async () => {
    server.use(
      http.get('http://localhost:8080/api/admin/users', () =>
        HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
      ),
    )
    renderPage()
    await screen.findByRole('alert')
    expect(screen.queryByText('@diegomartinez')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Filtros, orden y acciones por fila
// ---------------------------------------------------------------------------

const API = 'http://localhost:8080/api'

function adminUser(overrides: Partial<(typeof mockCurrentUser) & { id: string }>) {
  return { ...mockCurrentUser, createdAt: '2025-01-01T00:00:00Z', ...overrides } as typeof mockCurrentUser & { id: string }
}

const ANA = adminUser({ id: 'user-ana', nickname: 'ana', name: 'Ana Pérez', email: 'ana@correo.com', role: 'CONTESTANT', status: 'ACTIVE' })
const BETO = adminUser({ id: 'user-beto', nickname: 'beto', name: 'Beto Ruiz', email: 'beto@correo.com', role: 'COACH', status: 'ACTIVE' })
const ROOT = adminUser({ id: 'user-root', nickname: 'root', name: 'Root Admin', email: 'root@correo.com', role: 'ADMIN', status: 'ACTIVE' })
const GONE = adminUser({ id: 'user-gone', nickname: 'gone', name: 'Gone User', email: 'gone@correo.com', role: 'CONTESTANT', status: 'DEACTIVATED' })

/** Serves the admin user list and filter options; returns the query string of every list request. */
function stubAdminUsers(users = [ANA, BETO, ROOT, GONE]) {
  const queries: URLSearchParams[] = []
  server.use(
    http.get(`${API}/admin/users`, ({ request }) => {
      queries.push(new URL(request.url).searchParams)
      return HttpResponse.json({
        users,
        pagination: { page: 1, limit: 5, total: users.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      })
    }),
    http.get(`${API}/admin/users/filters`, () =>
      HttpResponse.json({ countries: ['Colombia', 'Perú'], cities: ['Bogotá', 'Lima'], institutions: ['UN', 'PUCP'] }),
    ),
  )
  return { last: () => queries[queries.length - 1] }
}

async function openRowMenu(user: ReturnType<typeof userEvent.setup>, nickname: string) {
  await user.click(await screen.findByRole('button', { name: `Acciones para @${nickname}` }))
}

async function pickOption(user: ReturnType<typeof userEvent.setup>, selectName: string, optionName: string) {
  await user.click(screen.getByRole('combobox', { name: selectName }))
  await user.click(await screen.findByRole('option', { name: optionName }))
}

describe('UsersListPage — filtros y orden', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('pide por defecto solo los usuarios activos, los más recientes primero', async () => {
    const requests = stubAdminUsers()
    renderPage()
    await screen.findByText('@ana')

    expect(requests.last().get('status')).toBe('ACTIVE')
    expect(requests.last().get('sort')).toBe('createdAt')
    expect(requests.last().get('order')).toBe('desc')
    expect(requests.last().has('role')).toBe(false)
  })

  it('busca por nombre o nickname tras la pausa de escritura', async () => {
    const requests = stubAdminUsers()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('@ana')

    await user.type(screen.getByPlaceholderText('Buscar por nombre o nickname...'), 'beto')

    await waitFor(() => expect(requests.last().get('searchTerm')).toBe('beto'), { timeout: 3000 })
  })

  it('filtra por rol y vuelve a todos con «Todos los roles»', async () => {
    const requests = stubAdminUsers()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('@ana')

    await pickOption(user, 'Filtrar por rol', 'Coach')
    await waitFor(() => expect(requests.last().get('role')).toBe('COACH'))
    await pickOption(user, 'Filtrar por rol', 'Todos los roles')

    await waitFor(() => expect(requests.last().has('role')).toBe(false))
  })

  it('«Todos los estados» quita el filtro de estado y Desactivado pide status=DEACTIVATED', async () => {
    const requests = stubAdminUsers()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('@ana')

    await pickOption(user, 'Filtrar por estado', 'Todos los estados')
    await waitFor(() => expect(requests.last().has('status')).toBe(false))
    await pickOption(user, 'Filtrar por estado', 'Desactivado')

    await waitFor(() => expect(requests.last().get('status')).toBe('DEACTIVATED'))
  })

  it.each([
    ['Filtrar por país', 'Perú', 'country'],
    ['Filtrar por ciudad', 'Lima', 'city'],
    ['Filtrar por institución', 'PUCP', 'institution'],
  ])('%s con «%s» pide %s', async (selectName, option, param) => {
    const requests = stubAdminUsers()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('@ana')

    await pickOption(user, selectName, option)

    await waitFor(() => expect(requests.last().get(param)).toBe(option))
  })

  it('permite volver a todos los países, ciudades e instituciones', async () => {
    const requests = stubAdminUsers()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('@ana')
    await pickOption(user, 'Filtrar por país', 'Perú')
    await waitFor(() => expect(requests.last().get('country')).toBe('Perú'))

    await user.click(screen.getByRole('combobox', { name: 'Filtrar por país' }))
    await user.click(await screen.findByRole('option', { name: /^Todos/ }))

    await waitFor(() => expect(requests.last().has('country')).toBe(false))
  })

  it('ordena por nombre de la A a la Z', async () => {
    const requests = stubAdminUsers()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('@ana')

    await pickOption(user, 'Ordenar usuarios por', 'Nombre (A-Z)')

    await waitFor(() => {
      expect(requests.last().get('sort')).toBe('name')
      expect(requests.last().get('order')).toBe('asc')
    })
  })
})

describe('UsersListPage — acciones por fila', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
    stubAdminUsers()
  })
  afterEach(() => clearAccessToken())

  it('un competidor ofrece subir a Coach pero no bajar', async () => {
    const user = userEvent.setup()
    renderPage()
    await openRowMenu(user, 'ana')

    expect(await screen.findByRole('menuitem', { name: /Subir a Coach/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Bajar a Competidor/ })).not.toBeInTheDocument()
  })

  it('un coach ofrece bajar a Competidor pero no subir', async () => {
    const user = userEvent.setup()
    renderPage()
    await openRowMenu(user, 'beto')

    expect(await screen.findByRole('menuitem', { name: /Bajar a Competidor/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Subir a Coach/ })).not.toBeInTheDocument()
  })

  it('un administrador solo se puede editar: no se cambia su rol ni se desactiva', async () => {
    const user = userEvent.setup()
    renderPage()
    await openRowMenu(user, 'root')

    expect(await screen.findByRole('menuitem', { name: /Editar usuario/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Subir a Coach|Bajar a Competidor|Desactivar usuario/ })).not.toBeInTheDocument()
  })

  it('un usuario desactivado no tiene menú de acciones', async () => {
    renderPage()
    await screen.findByText('@gone')

    expect(screen.queryByRole('button', { name: 'Acciones para @gone' })).not.toBeInTheDocument()
  })

  it('sube a Coach tras confirmar y avisa', async () => {
    const calls = stubEndpoint('put', '/admin/users/user-ana', { body: { ...ANA, role: 'COACH' } })
    const user = userEvent.setup()
    renderPage()
    await openRowMenu(user, 'ana')

    await user.click(await screen.findByRole('menuitem', { name: /Subir a Coach/ }))
    expect(await screen.findByText(/¿Seguro que quieres cambiar a @ana de Competidor a Coach\?/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith({ variant: 'success', title: 'Rol actualizado' }))
    expect(calls[0].body).toEqual({ role: 'COACH' })
  })

  it('baja a Competidor tras confirmar', async () => {
    const calls = stubEndpoint('put', '/admin/users/user-beto', { body: { ...BETO, role: 'CONTESTANT' } })
    const user = userEvent.setup()
    renderPage()
    await openRowMenu(user, 'beto')

    await user.click(await screen.findByRole('menuitem', { name: /Bajar a Competidor/ }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0].body).toEqual({ role: 'CONTESTANT' })
  })

  it('no cambia el rol si se cancela la confirmación', async () => {
    const calls = stubEndpoint('put', '/admin/users/user-ana', { body: ANA })
    const user = userEvent.setup()
    renderPage()
    await openRowMenu(user, 'ana')

    await user.click(await screen.findByRole('menuitem', { name: /Subir a Coach/ }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByText(/¿Seguro que quieres cambiar/)).not.toBeInTheDocument())
    expect(calls).toHaveLength(0)
  })

  it('avisa del error cuando el cambio de rol falla', async () => {
    stubEndpoint('put', '/admin/users/user-ana', { status: 500, body: { error: 'SERVER_ERROR', message: 'fallo' } })
    const user = userEvent.setup()
    renderPage()
    await openRowMenu(user, 'ana')

    await user.click(await screen.findByRole('menuitem', { name: /Subir a Coach/ }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al actualizar rol' })),
    )
  })

  describe('desactivar', () => {
    it('desactiva al usuario tras confirmar cuando no es único líder de ningún grupo', async () => {
      stubEndpoint('get', '/admin/users/user-ana/sole-lead-groups', { body: { groups: [] } })
      const calls = stubEndpoint('post', '/admin/users/user-ana/deactivate')
      const user = userEvent.setup()
      renderPage()
      await openRowMenu(user, 'ana')

      await user.click(await screen.findByRole('menuitem', { name: /Desactivar usuario/ }))
      await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

      await waitFor(() => expect(mockToast).toHaveBeenCalledWith({ variant: 'success', title: 'Usuario desactivado' }))
      expect(calls).toHaveLength(1)
    })

    it('advierte de los grupos que quedarían sin líder', async () => {
      stubEndpoint('get', '/admin/users/user-ana/sole-lead-groups', { body: { groups: [{ id: 'g1', name: 'ICPC Colombia' }] } })
      const user = userEvent.setup()
      renderPage()
      await openRowMenu(user, 'ana')

      await user.click(await screen.findByRole('menuitem', { name: /Desactivar usuario/ }))

      expect(await screen.findByText(/es el único líder de «ICPC Colombia»; ese grupo quedará sin líder/)).toBeInTheDocument()
    })

    it('avisa de que no se pudo comprobar si es único líder cuando la consulta falla', async () => {
      stubEndpoint('get', '/admin/users/user-ana/sole-lead-groups', { status: 500, body: { error: 'SERVER_ERROR', message: 'fallo' } })
      const user = userEvent.setup()
      renderPage()
      await openRowMenu(user, 'ana')

      await user.click(await screen.findByRole('menuitem', { name: /Desactivar usuario/ }))

      expect(await screen.findByText(/No se pudo comprobar si es el único líder de algún grupo/)).toBeInTheDocument()
    })

    it.each([
      ['CANNOT_SELF_DEACTIVATE', { variant: 'error', title: 'No puedes desactivar tu propia cuenta', description: 'Pídele a otro Administrador que lo haga por ti.' }],
      ['CANNOT_DEACTIVATE_ADMIN', { variant: 'error', title: 'No se puede desactivar a otro Administrador' }],
    ])('explica el error %s', async (code, expectedToast) => {
      stubEndpoint('get', '/admin/users/user-ana/sole-lead-groups', { body: { groups: [] } })
      stubEndpoint('post', '/admin/users/user-ana/deactivate', { status: 409, body: { error: code, message: 'x' } })
      const user = userEvent.setup()
      renderPage()
      await openRowMenu(user, 'ana')

      await user.click(await screen.findByRole('menuitem', { name: /Desactivar usuario/ }))
      await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

      await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expectedToast))
    })

    it('muestra un aviso genérico cuando desactivar falla por otra causa', async () => {
      stubEndpoint('get', '/admin/users/user-ana/sole-lead-groups', { body: { groups: [] } })
      stubEndpoint('post', '/admin/users/user-ana/deactivate', { status: 500, body: { error: 'SERVER_ERROR', message: 'fallo' } })
      const user = userEvent.setup()
      renderPage()
      await openRowMenu(user, 'ana')

      await user.click(await screen.findByRole('menuitem', { name: /Desactivar usuario/ }))
      await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

      await waitFor(() =>
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al desactivar usuario' })),
      )
    })
  })

  describe('editar', () => {
    it('abre el formulario con los datos del usuario y guarda los cambios', async () => {
      const calls = stubEndpoint('put', '/admin/users/user-ana', { body: { ...ANA, name: 'Ana María' } })
      const user = userEvent.setup()
      renderPage()
      await openRowMenu(user, 'ana')

      await user.click(await screen.findByRole('menuitem', { name: /Editar usuario/ }))
      expect(await screen.findByText('Editar usuario @ana')).toBeInTheDocument()
      const name = screen.getByLabelText('Nombre')
      expect(name).toHaveValue('Ana Pérez')
      await user.clear(name)
      await user.type(name, 'Ana María')
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      await waitFor(() => expect(mockToast).toHaveBeenCalledWith({ variant: 'success', title: 'Usuario actualizado' }))
      expect((calls[0].body as { name: string }).name).toBe('Ana María')
      await waitFor(() => expect(screen.queryByText('Editar usuario @ana')).not.toBeInTheDocument())
    })

    it('avisa del error y deja el formulario abierto cuando el servidor rechaza los cambios', async () => {
      stubEndpoint('put', '/admin/users/user-ana', { status: 409, body: { error: 'EMAIL_TAKEN', message: 'correo en uso' } })
      const user = userEvent.setup()
      renderPage()
      await openRowMenu(user, 'ana')

      await user.click(await screen.findByRole('menuitem', { name: /Editar usuario/ }))
      await user.click(await screen.findByRole('button', { name: 'Guardar cambios' }))

      await waitFor(() =>
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al actualizar el usuario' })),
      )
      expect(screen.getByText('Editar usuario @ana')).toBeInTheDocument()
    })

    it('Cancelar cierra el formulario sin guardar', async () => {
      const calls = stubEndpoint('put', '/admin/users/user-ana', { body: ANA })
      const user = userEvent.setup()
      renderPage()
      await openRowMenu(user, 'ana')

      await user.click(await screen.findByRole('menuitem', { name: /Editar usuario/ }))
      await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

      await waitFor(() => expect(screen.queryByText('Editar usuario @ana')).not.toBeInTheDocument())
      expect(calls).toHaveLength(0)
    })
  })
})
