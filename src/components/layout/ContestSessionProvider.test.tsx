import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse, delay } from 'msw'

import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { useContestSession } from '@/hooks/useContestSession'
import { ContestSessionProvider } from './ContestSessionProvider'

let queryClient: QueryClient
beforeEach(() => {
  queryClient = createTestQueryClient()
  clearAccessToken()
  setAccessToken('mock-jwt-token-luisadmin')
})

function SessionProbe() {
  const { groupId, contestId, contest, isLoading } = useContestSession()
  return (
    <dl>
      <dt>group</dt>
      <dd data-testid="group">{groupId ?? 'none'}</dd>
      <dt>contest</dt>
      <dd data-testid="contest">{contestId ?? 'none'}</dd>
      <dt>name</dt>
      <dd data-testid="name">{contest?.name ?? 'none'}</dd>
      <dt>loading</dt>
      <dd data-testid="loading">{isLoading ? 'yes' : 'no'}</dd>
    </dl>
  )
}

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <ContestSessionProvider>
          <SessionProbe />
        </ContestSessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ContestSessionProvider', () => {
  it('expone los ids de la URL y carga el contest de /groups/:groupId/contests/:contestId', async () => {
    renderAt('/groups/group-1/contests/contest-1')

    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('Competencia Semanal #12'))
    expect(screen.getByTestId('group').textContent).toBe('group-1')
    expect(screen.getByTestId('contest').textContent).toBe('contest-1')
    expect(screen.getByTestId('loading').textContent).toBe('no')
  })

  it('mantiene la sesión en las subrutas del contest (standings)', async () => {
    renderAt('/groups/group-1/contests/contest-1/standings')

    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('Competencia Semanal #12'))
    expect(screen.getByTestId('contest').textContent).toBe('contest-1')
  })

  it('indica isLoading mientras el contest está pendiente de respuesta', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () => delay('infinite')),
    )

    renderAt('/groups/group-1/contests/contest-1')

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('yes'))
    expect(screen.getByTestId('name').textContent).toBe('none')
  })

  it('deja contest sin definir y termina de cargar cuando el servidor responde 404', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
        HttpResponse.json({ error: 'NOT_FOUND', message: 'no existe' }, { status: 404 }),
      ),
    )

    renderAt('/groups/group-1/contests/contest-missing')

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('no'))
    expect(screen.getByTestId('contest').textContent).toBe('contest-missing')
    expect(screen.getByTestId('name').textContent).toBe('none')
  })

  it('no trata /contests/new (formulario de creación) como un contest y no hace ninguna petición', async () => {
    let requests = 0
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () => {
        requests += 1
        return HttpResponse.json({ error: 'NOT_FOUND', message: 'no existe' }, { status: 404 })
      }),
    )

    renderAt('/groups/group-1/contests/new')

    expect(screen.getByTestId('contest').textContent).toBe('none')
    expect(screen.getByTestId('group').textContent).toBe('none')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(requests).toBe(0)
  })

  it.each([
    ['/problems/two-sum'],
    ['/groups/group-1'],
    ['/groups/group-1/contests'],
    ['/dashboard'],
  ])('no hay sesión de contest en %s', (path) => {
    renderAt(path)

    expect(screen.getByTestId('contest').textContent).toBe('none')
    expect(screen.getByTestId('group').textContent).toBe('none')
    expect(screen.getByTestId('loading').textContent).toBe('no')
  })

  it('un contest cuyo id empieza por "new" pero no es "new" sí se carga', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', ({ params }) =>
        HttpResponse.json({ ...structuredClone(contestStub), id: params.contestId, name: 'Nuevo año' }),
      ),
    )

    renderAt('/groups/group-1/contests/newyear-cup')

    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('Nuevo año'))
    expect(screen.getByTestId('contest').textContent).toBe('newyear-cup')
  })
})

// Minimal body for the handler above; only fields the provider's consumers read matter here
const contestStub = {
  id: 'x',
  name: 'x',
  description: '',
  startTime: '2030-01-01T10:00:00Z',
  endTime: '2030-01-01T15:00:00Z',
  duration: 18000,
  status: 'SCHEDULED',
  group: { id: 'group-1', name: 'ICPC Colombia' },
}
