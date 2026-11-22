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
import { MaterialsPage } from './MaterialsPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

const mockLogout = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: (role: string) => mockCurrentUser.role === role || mockCurrentUser.role === 'ADMIN',
    lastNickname: mockCurrentUser.nickname,
    logout: mockLogout,
  }),
}))

function renderPage(groupId = 'group-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/materials`]}>
        <Routes>
          <Route path="/groups/:groupId/materials" element={<MaterialsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MaterialsPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
  })
  afterEach(() => clearAccessToken())

  it('renders material list', async () => {
    renderPage()
    expect(await screen.findByText('Bienvenidos al grupo de entrenamiento')).toBeInTheDocument()
  })

  it('gives the sort selector an accessible name', async () => {
    renderPage()
    await screen.findByText('Bienvenidos al grupo de entrenamiento')
    expect(screen.getByRole('combobox', { name: 'Ordenar por criterio' })).toBeInTheDocument()
  })

  it('shows create button for ADMIN', async () => {
    renderPage()
    await screen.findByText('Bienvenidos al grupo de entrenamiento')
    expect(screen.getByRole('button', { name: /nuevo material/i })).toBeInTheDocument()
  })

  it('shows empty state when no materials', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/materials', () =>
        HttpResponse.json({ materials: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
      ),
    )
    renderPage()
    await screen.findByText('No se encontraron materiales')
    expect(screen.queryByText('Bienvenidos al grupo de entrenamiento')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Filtros, orden y creación
// ---------------------------------------------------------------------------

const LIST_URL = 'http://localhost:8080/api/groups/:groupId/materials'

/** Answers the materials list with one item and records the query string of every request. */
function recordListRequests() {
  const queries: URLSearchParams[] = []
  server.use(
    http.get(LIST_URL, ({ request }) => {
      queries.push(new URL(request.url).searchParams)
      return HttpResponse.json({
        materials: [],
        pagination: { page: 1, limit: 5, total: 0, totalPages: 1 },
      })
    }),
  )
  return {
    last: () => queries[queries.length - 1],
    count: () => queries.length,
  }
}

function renderWithCreateSentinel() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/groups/group-1/materials']}>
        <Routes>
          <Route path="/groups/:groupId/materials" element={<MaterialsPage />} />
          <Route path="/groups/:groupId/materials/new" element={<div>NEW_MATERIAL_SENTINEL</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MaterialsPage — filtros y orden', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it('busca por texto con al menos 2 caracteres', async () => {
    const requests = recordListRequests()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('No se encontraron materiales')

    await user.type(screen.getByPlaceholderText('Buscar materiales...'), 'grafos')

    await waitFor(() => expect(requests.last().get('q')).toBe('grafos'), { timeout: 3000 })
  })

  it('avisa y no busca cuando el texto tiene un solo carácter', async () => {
    const requests = recordListRequests()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('No se encontraron materiales')

    await user.type(screen.getByPlaceholderText('Buscar materiales...'), 'g')

    expect(await screen.findByText('Escribe al menos 2 caracteres para buscar')).toBeInTheDocument()
    expect(requests.last().has('q')).toBe(false)
  })

  it.each([
    ['Solo fijados', 'true'],
    ['No fijados', 'false'],
  ])('el filtro «%s» pide pinned=%s', async (label, expected) => {
    const requests = recordListRequests()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('No se encontraron materiales')

    await user.click(screen.getByRole('button', { name: label }))

    await waitFor(() => expect(requests.last().get('pinned')).toBe(expected))
  })

  it('el filtro de estado Borrador pide status=DRAFT a un líder', async () => {
    const requests = recordListRequests()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('No se encontraron materiales')

    await user.click(screen.getByRole('button', { name: 'Borrador' }))

    await waitFor(() => expect(requests.last().get('status')).toBe('DRAFT'))
  })

  it('filtra por rango de fecha de publicación', async () => {
    const requests = recordListRequests()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('No se encontraron materiales')

    await user.type(screen.getByLabelText('Publicado desde'), '2025-01-15')
    await user.type(screen.getByLabelText('Publicado hasta'), '2025-02-20')

    await waitFor(() => {
      expect(requests.last().get('publishedFrom')).toBe('2025-01-15')
      expect(requests.last().get('publishedTo')).toBe('2025-02-20')
    })
  })

  it('filtra por autor al pulsar Enter y quita el filtro al borrar el texto', async () => {
    const requests = recordListRequests()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('No se encontraron materiales')
    const author = screen.getByPlaceholderText('Nickname...')

    await user.type(author, 'mariacoach{Enter}')
    await waitFor(() => expect(requests.last().get('author')).toBe('mariacoach'))
    await user.clear(author)

    await waitFor(() => expect(requests.last().has('author')).toBe(false))
  })

  it('filtra por un tag escrito en minúsculas y lo quita al borrarlo', async () => {
    const requests = recordListRequests()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('No se encontraron materiales')
    const tag = screen.getByPlaceholderText('tag exacto...')

    await user.type(tag, 'DP')
    await waitFor(() => expect(requests.last().get('tags')).toBe('dp'), { timeout: 3000 })
    await user.clear(tag)

    await waitFor(() => expect(requests.last().has('tags')).toBe(false), { timeout: 3000 })
  })

  it('ordena por título y avisa de que los fijados no se priorizan', async () => {
    const requests = recordListRequests()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('No se encontraron materiales')
    expect(screen.getByText('Los fijados aparecen primero')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Ordenar por criterio' }))
    await user.click(await screen.findByRole('option', { name: 'Título' }))

    await waitFor(() => expect(requests.last().get('sort')).toBe('title'))
    expect(screen.getByText('Los fijados no se priorizan ordenando por título')).toBeInTheDocument()
  })

  it('no manda sort cuando el orden es Relevancia', async () => {
    const requests = recordListRequests()
    renderPage()
    await screen.findByText('No se encontraron materiales')

    expect(requests.last().has('sort')).toBe(false)
  })

  it('vuelve a la primera página al cambiar un filtro', async () => {
    const requests = recordListRequests()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('No se encontraron materiales')

    await user.click(screen.getByRole('button', { name: 'Solo fijados' }))

    await waitFor(() => expect(requests.last().get('page')).toBe('1'))
  })

  it('el botón Nuevo material lleva al formulario de creación', async () => {
    recordListRequests()
    const user = userEvent.setup()
    renderWithCreateSentinel()

    await user.click(await screen.findByRole('button', { name: /nuevo material/i }))

    expect(await screen.findByText('NEW_MATERIAL_SENTINEL')).toBeInTheDocument()
  })
})
