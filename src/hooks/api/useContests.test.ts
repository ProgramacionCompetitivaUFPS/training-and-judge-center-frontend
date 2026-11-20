import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { ApiClientError } from '@/lib/errors'
import { mockContests, mockContestReveals } from '@/mocks/data'
import type { ContestDetail, CreateContestRequest, StandingsParams, StandingsPhase, StandingsResponse } from '@/types/contest'
import {
  contestKeys,
  standingsRefetchInterval,
  useMyContests,
  useContests,
  useContestDetail,
  useCreateContest,
  useRegistrationStatus,
  useRegistrations,
  useStandings,
  useStandingsFilterOptions,
  useContestSubmissions,
  useUpdateContest,
  useDeleteContest,
  useRegisterToContest,
  useUnregisterFromContest,
  useRevealContestResults,
} from './useContests'

function makeWrapper() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

const initialContests = structuredClone(mockContests)

const baseContest: CreateContestRequest = {
  name: 'Nuevo Concurso',
  startTime: '2026-12-01T10:00:00Z',
  endTime: '2026-12-01T14:00:00Z',
}

beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
afterEach(() => clearAccessToken())

describe('useMyContests', () => {
  it('retorna lista paginada de concursos accesibles', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMyContests(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.total).toBeGreaterThan(0)
    expect(result.current.data?.items.some((c) => c.id === 'contest-1')).toBe(true)
  })

  it('propaga error cuando el servidor responde 500', async () => {
    server.use(
      http.get('http://localhost:8080/api/contests', () =>
        HttpResponse.json({ error: 'SERVER_ERROR', message: 'Error interno' }, { status: 500 }),
      ),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMyContests(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useContests', () => {
  it('retorna concursos del grupo con al menos un item conocido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useContests(mockContests[0].group.id), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.total).toBeGreaterThan(0)
    expect(result.current.data?.items.some((c) => c.id === mockContests[0].id)).toBe(true)
  })

  it('no hace fetch cuando groupId está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useContests(''), { wrapper })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})

describe('useContestDetail', () => {
  it('retorna el detalle del concurso para IDs válidos', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useContestDetail(mockContests[0].group.id, mockContests[0].id),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe('contest-1')
    expect(result.current.data?.name).toBe('Competencia Semanal #12')
  })

  it('no hace fetch cuando groupId está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useContestDetail('', mockContests[0].id), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })

  it('propaga error 404 para un contestId desconocido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useContestDetail(mockContests[0].group.id, 'no-existe'),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateContest', () => {
  beforeEach(() => {
    server.use(
      http.post('http://localhost:8080/api/groups/:groupId/contests', () =>
        HttpResponse.json({ id: 'contest-new', name: baseContest.name }, { status: 201 }),
      ),
    )
  })

  it('invalida contestKeys.all al crear con éxito', async () => {
    // Arrange
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateContest(), { wrapper })

    // Act
    result.current.mutate({ groupId: mockContests[0].group.id, data: baseContest })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(result.current.data?.name).toBe('Nuevo Concurso')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: contestKeys.all }))
  })
})

describe('useMyContests paginación', () => {
  it('mantiene visible la página anterior mientras carga la siguiente', async () => {
    // Arrange
    const { wrapper } = makeWrapper()
    const { result, rerender } = renderHook(
      ({ page }) => useMyContests({ page, limit: 1 }),
      { wrapper, initialProps: { page: 1 } },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const firstPageId = result.current.data?.items[0].id

    // Act
    rerender({ page: 2 })

    // Assert: the list is not replaced by a loading state in between
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data?.pagination.page).toBe(1)
    expect(result.current.data?.items[0].id).toBe(firstPageId)

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false))
    expect(result.current.data?.pagination.page).toBe(2)
    expect(result.current.data?.items[0].id).not.toBe(firstPageId)
  })
})

describe('useRegistrationStatus', () => {
  it('retorna el estado de inscripción para IDs válidos', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRegistrationStatus('group-1', 'contest-2'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.registered).toBe(true)
  })

  it('no hace fetch cuando algún ID está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRegistrationStatus('', 'contest-1'), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useRegistrations', () => {
  it('retorna lista de registros individuales con total y nickname conocido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRegistrations('group-1', 'contest-2'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.total).toBe(7)
    expect(result.current.data?.registrations.some((r) => r.nickname === 'luisadmin')).toBe(true)
  })

  it('no hace fetch cuando groupId está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRegistrations('', 'contest-1'), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useStandings', () => {
  it('retorna tabla de posiciones con al menos un entry conocido', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandings('group-1', 'contest-2'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(
      result.current.data?.standings.some((e) => e.participant.displayName === 'Competitive Coders'),
    ).toBe(true)
  })

  it('no hace fetch cuando algún ID está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandings('', 'contest-2'), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useStandings (mock con colores y estadísticas)', () => {
  async function loadStandings(params?: { limit?: number }) {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandings('group-1', 'contest-2', params), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    return result.current.data!
  }

  it('devuelve color y contadores globales por problema', async () => {
    const data = await loadStandings()

    expect(data.problems[0]).toMatchObject({ position: 1, slug: 'two-sum', color: '#e11d48', accepted: 5, tried: 5 })
    expect(data.problems[1]).toMatchObject({ color: '#2563eb', accepted: 3, tried: 4 })
    expect(data.problems[2]).toMatchObject({ color: null, accepted: 3, tried: 5 })
  })

  it('marca solo el primer AC con isFirstSolve', async () => {
    const data = await loadStandings()

    expect(data.standings[0].problems[0].isFirstSolve).toBe(true)
    expect(data.standings[1].problems[0].isFirstSolve).toBeUndefined()
  })

  it('mantiene los contadores globales aunque se pida una sola fila', async () => {
    const data = await loadStandings({ limit: 2 })

    expect(data.standings).toHaveLength(2)
    expect(data.problems[0].accepted).toBe(5)
  })

  it('devuelve una celda por problema de la competencia en cada fila', async () => {
    const data = await loadStandings()

    expect(data.standings[0].problems).toHaveLength(3)
  })
})

describe('useStandings (contest-7 con muchos datos)', () => {
  it('devuelve 13 problemas, 30 participantes y celdas alineadas', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandings('group-1', 'contest-7', { limit: 100 }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.problems).toHaveLength(13)
    expect(result.current.data?.standings).toHaveLength(30)
    expect(result.current.data?.pagination.total).toBe(30)
    expect(result.current.data?.standings[29].problems).toHaveLength(13)
  })
})

describe('useStandings con phase (mock)', () => {
  async function load(contestId: string, params?: StandingsParams) {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandings('group-1', contestId, params), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    return result.current.data!
  }

  it('devuelve solo las filas de post-competencia sin rank y no oficiales', async () => {
    // Arrange / Act
    const data = await load('contest-8', { phase: 'postcompetition' })

    // Assert
    expect(data.standings.map((e) => e.participant.displayName)).toEqual(['lauramendez', 'andresrojas', 'carlosvega'])
    expect(data.standings[0].rank).toBeNull()
    expect(data.standings[0].isOfficial).toBe(false)
    expect(data.standings[2].problemsSolved).toBe(0)
  })

  it('calcula los contadores de post-competencia sobre las filas de post', async () => {
    const data = await load('contest-8', { phase: 'postcompetition' })

    expect(data.problems[0]).toMatchObject({ color: '#e11d48', accepted: 1, tried: 2 })
    expect(data.problems[1]).toMatchObject({ accepted: 1, tried: 1 })
    expect(data.problems[2]).toMatchObject({ accepted: 1, tried: 1 })
  })

  it('devuelve solo las filas oficiales con la fase competition', async () => {
    const data = await load('contest-8', { phase: 'competition' })

    expect(data.standings).toHaveLength(5)
    expect(data.standings.every((e) => e.isOfficial !== false)).toBe(true)
    expect(data.problems[0]).toMatchObject({ accepted: 5, tried: 5 })
  })

  it('devuelve oficiales primero y luego post con la fase all', async () => {
    const data = await load('contest-8', { phase: 'all' })

    expect(data.standings).toHaveLength(8)
    expect(data.standings[0].participant.displayName).toBe('Competitive Coders')
    expect(data.standings[5].participant.displayName).toBe('lauramendez')
    expect(data.pagination.total).toBe(8)
    expect(data.problems[0]).toMatchObject({ accepted: 5, tried: 5 })
  })

  it('manda siempre los contadores de post-competencia, también con la fase competition', async () => {
    const data = await load('contest-8', { phase: 'competition' })

    expect(data.problems[0]).toMatchObject({ accepted: 5, tried: 5, postAccepted: 1, postTried: 2 })
    expect(data.problems[1]).toMatchObject({ postAccepted: 1, postTried: 1 })
    expect(data.problems[2]).toMatchObject({ postAccepted: 1, postTried: 1 })
  })

  it('manda los contadores de post-competencia en 0 cuando la competencia no tiene fase post', async () => {
    const data = await load('contest-2', { phase: 'all' })

    expect(data.problems[0]).toMatchObject({ postAccepted: 0, postTried: 0 })
  })

  it('no filtra los contadores de post-competencia por país', async () => {
    const data = await load('contest-8', { phase: 'all', country: 'Argentina' })

    expect(data.problems[0]).toMatchObject({ postAccepted: 1, postTried: 2 })
  })

  it('trata la ausencia de phase como all', async () => {
    const data = await load('contest-8')

    expect(data.standings).toHaveLength(8)
  })

  it('pagina cruzando de las filas oficiales a las de post', async () => {
    const data = await load('contest-8', { phase: 'all', limit: 3, page: 2 })

    expect(data.standings.map((e) => e.participant.displayName)).toEqual(['Algorithm Masters', 'sofiarodriguez', 'lauramendez'])
    expect(data.pagination.totalPages).toBe(3)
  })

  it('aplica el filtro de país a las dos secciones', async () => {
    const data = await load('contest-8', { phase: 'all', country: 'Colombia' })

    expect(data.standings.map((e) => e.participant.displayName)).toEqual([
      'sofiarodriguez',
      'lauramendez',
      'andresrojas',
      'carlosvega',
    ])
  })

  it('no devuelve filas de post en una competencia ACTIVE aunque tenga post habilitada', async () => {
    const postOnly = await load('contest-2', { phase: 'postcompetition' })
    const all = await load('contest-2', { phase: 'all' })

    expect(postOnly.standings).toEqual([])
    expect(all.standings).toHaveLength(5)
  })

  it('no devuelve filas de post en una competencia finalizada sin post-competencia', async () => {
    const data = await load('contest-3', { phase: 'all' })

    expect(data.standings).toHaveLength(5)
  })

  it('responde 400 BAD_REQUEST ante una phase inválida', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useStandings('group-1', 'contest-8', { phase: 'bogus' as unknown as StandingsPhase }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(ApiClientError)
    expect((result.current.error as ApiClientError).status).toBe(400)
    expect((result.current.error as ApiClientError).code).toBe('BAD_REQUEST')
  })
})

describe('useStandings refresco automático', () => {
  const STANDINGS_URL = 'http://localhost:8080/api/groups/:groupId/contests/:contestId/standings'

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  async function countRequestsAfter10Seconds(contestId: string, phase: StandingsPhase) {
    let requests = 0
    server.use(
      http.get(STANDINGS_URL, () => {
        requests += 1
      }),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandings('group-1', contestId, { phase }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await vi.advanceTimersByTimeAsync(10_000)
    await vi.advanceTimersByTimeAsync(1_000)
    return requests
  }

  it('vuelve a pedir los standings cada 10 s en una competencia finalizada cuando se piden filas de post', async () => {
    const requests = await countRequestsAfter10Seconds('contest-8', 'all')

    expect(requests).toBe(2)
  })

  it('no vuelve a pedir los standings de una competencia finalizada cuando solo se piden las oficiales', async () => {
    const requests = await countRequestsAfter10Seconds('contest-8', 'competition')

    expect(requests).toBe(1)
  })
})

describe('useStandings congelado (mock)', () => {
  async function load(contestId: string) {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandings('group-1', contestId), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    return result.current.data!
  }

  beforeEach(() => {
    mockContestReveals.clear()
  })

  it('marca la competencia como congelada y expone el inicio del congelamiento', async () => {
    // Arrange / Act
    const data = await load('contest-6')

    // Assert
    expect(data.contest.isFrozen).toBe(true)
    expect(data.contest.frozenAt).toEqual(expect.any(String))
  })

  it('fija el inicio del congelamiento 60 minutos antes del fin de la competencia', async () => {
    // Arrange / Act
    const data = await load('contest-6')

    // Assert
    const minutesBeforeEnd = (Date.parse(data.contest.endTime) - Date.parse(data.contest.frozenAt!)) / 60_000
    expect(minutesBeforeEnd).toBe(60)
  })

  it('sigue congelado tras el fin de la competencia hasta que se revele', async () => {
    // Arrange: 30 minutos después, contest-6 (que termina en 20) ya acabó
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(Date.now() + 30 * 60_000)

    try {
      // Act
      const data = await load('contest-6')

      // Assert
      expect(data.contest.status).toBe('FINISHED')
      expect(data.contest.isFrozen).toBe(true)
      expect(data.contest.resultsRevealedAt).toBeNull()
      expect(data.standings.flatMap((entry) => entry.problems).some((cell) => cell.status === 'PENDING')).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('muestra los resultados reales una vez revelados', async () => {
    // Arrange: 30 minutos después, contest-6 ya terminó y se reveló a mano
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(Date.now() + 30 * 60_000)
    mockContestReveals.set('contest-6', new Date().toISOString())

    try {
      // Act
      const data = await load('contest-6')

      // Assert
      expect(data.contest.isFrozen).toBe(false)
      expect(data.contest.frozenAt).toBeNull()
      expect(data.contest.resultsRevealedAt).toEqual(expect.any(String))
      expect(data.standings.flatMap((entry) => entry.problems).some((cell) => cell.status === 'PENDING')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('no marca como congelada una competencia activa sin freeze configurado', async () => {
    // Arrange / Act
    const data = await load('contest-7')

    // Assert
    expect(data.contest.freezeMinutes).toBeNull()
    expect(data.contest.isFrozen).toBe(false)
    expect(data.contest.frozenAt).toBeNull()
  })

  it('no marca como congelada una competencia activa sin freeze vigente', async () => {
    const data = await load('contest-2')

    expect(data.contest.isFrozen).toBe(false)
    expect(data.contest.frozenAt).toBeNull()
  })

  it('no marca como congelada una competencia finalizada', async () => {
    const data = await load('contest-3')

    expect(data.contest.isFrozen).toBe(false)
  })

  it('ordena las filas congeladas por resueltos y penalización', async () => {
    const data = await load('contest-6')

    expect(data.standings.map((e) => e.participant.displayName)).toEqual([
      'sofiarodriguez',
      'Competitive Coders',
      'carloscp',
      'anagarcia',
    ])
    expect(data.standings.map((e) => e.rank)).toEqual([1, 2, 3, 4])
  })

  it('devuelve una celda PENDING con su contador de envíos ocultos', async () => {
    const data = await load('contest-6')

    expect(data.standings[1].problems[1]).toMatchObject({
      position: 2,
      status: 'PENDING',
      attempts: 1,
      pending: 2,
      time: null,
      penalty: 0,
    })
  })

  it('devuelve una celda ACCEPTED anterior al freeze con pending en cero', async () => {
    const data = await load('contest-6')

    expect(data.standings[0].problems[0]).toMatchObject({
      status: 'ACCEPTED',
      time: 20,
      pending: 0,
      isFirstSolve: true,
    })
  })

  it('cuenta en los contadores solo lo visible en una competencia congelada', async () => {
    const data = await load('contest-6')

    expect(data.problems[0]).toMatchObject({ accepted: 3, tried: 3, postAccepted: 0, postTried: 0 })
    expect(data.problems[1]).toMatchObject({ accepted: 0, tried: 1 })
  })

  it('incluye pending en cero en las celdas de una competencia sin congelar', async () => {
    const data = await load('contest-2')

    expect(data.standings[0].problems[0].pending).toBe(0)
  })

  it('mantiene los contadores de una competencia sin celdas pendientes', async () => {
    const data = await load('contest-2')

    expect(data.problems[0]).toMatchObject({ accepted: 5, tried: 5 })
  })
})

describe('useStandings tiempo real (mock)', () => {
  async function load(contestId: string, params?: StandingsParams) {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandings('group-1', contestId, params), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    return result.current.data!
  }

  const hasPending = (data: StandingsResponse) =>
    data.standings.flatMap((entry) => entry.problems).some((cell) => cell.status === 'PENDING')

  it('devuelve los resultados reales de una competencia congelada cuando el admin pide realtime', async () => {
    // Arrange / Act
    const data = await load('contest-6', { realtime: true })

    // Assert
    expect(data.contest.isFrozen).toBe(true)
    expect(hasPending(data)).toBe(false)
    expect(data.standings.map((e) => e.participant.displayName)).toEqual([
      'Competitive Coders',
      'carloscp',
      'sofiarodriguez',
      'anagarcia',
    ])
    expect(data.standings.map((e) => e.rank)).toEqual([1, 2, 3, 4])
  })

  it('devuelve la celda revelada con sus tiempos y el primer AC marcado', async () => {
    const data = await load('contest-6', { realtime: true })

    expect(data.standings[0].problems[1]).toMatchObject({
      status: 'ACCEPTED',
      attempts: 2,
      time: 80,
      penalty: 40,
      pending: 0,
      isFirstSolve: true,
    })
  })

  it('cuenta los contadores de cabecera con los resultados reales', async () => {
    const data = await load('contest-6', { realtime: true })

    expect(data.problems[0]).toMatchObject({ accepted: 4, tried: 4 })
    expect(data.problems[1]).toMatchObject({ accepted: 2, tried: 2 })
  })

  it('sigue devolviendo la vista congelada cuando no se pide realtime', async () => {
    const data = await load('contest-6')

    expect(data.contest.isFrozen).toBe(true)
    expect(hasPending(data)).toBe(true)
    expect(data.standings.map((e) => e.participant.displayName)).toEqual([
      'sofiarodriguez',
      'Competitive Coders',
      'carloscp',
      'anagarcia',
    ])
  })

  it('devuelve los resultados reales a un líder que no es admin', async () => {
    // Arrange
    setAccessToken('mock-jwt-token-mariacoach')

    // Act
    const data = await load('contest-6', { realtime: true })

    // Assert
    expect(hasPending(data)).toBe(false)
  })

  it('responde 403 INSUFFICIENT_PERMISSIONS a quien no es admin ni líder del grupo', async () => {
    // Arrange
    setAccessToken('mock-jwt-token-carloscp')
    const { wrapper } = makeWrapper()

    // Act
    const { result } = renderHook(() => useStandings('group-1', 'contest-6', { realtime: true }), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Assert
    expect(result.current.error).toBeInstanceOf(ApiClientError)
    expect((result.current.error as ApiClientError).status).toBe(403)
    expect((result.current.error as ApiClientError).code).toBe('INSUFFICIENT_PERMISSIONS')
  })

  it('ignora realtime en una competencia sin congelamiento y no responde 403', async () => {
    // Arrange
    setAccessToken('mock-jwt-token-carloscp')

    // Act
    const data = await load('contest-2', { realtime: true })

    // Assert
    expect(data.contest.isFrozen).toBe(false)
    expect(data.standings).toHaveLength(5)
  })
})

describe('standingsRefetchInterval', () => {
  it.each([
    ['ACTIVE', undefined, undefined, 10000],
    ['ACTIVE', 'competition', undefined, 10000],
    ['ACTIVE', undefined, 30000, 30000],
    ['FINISHED', 'all', undefined, 10000],
    ['FINISHED', 'postcompetition', undefined, 10000],
    ['FINISHED', 'all', 30000, 10000],
    ['FINISHED', 'competition', undefined, false],
    ['FINISHED', undefined, undefined, 10000],
    ['SCHEDULED', 'all', undefined, false],
    [undefined, 'all', undefined, false],
  ] as const)(
    'con estado %s, fase %s e intervalo %s devuelve %s',
    (status, phase, interval, expected) => {
      expect(standingsRefetchInterval(status, phase, interval)).toBe(expected)
    },
  )

  it.each([
    ['FINISHED', 'competition', undefined, true, 10000],
    ['FINISHED', 'competition', 30000, true, 10000],
    ['FINISHED', 'competition', undefined, false, false],
    ['ACTIVE', 'competition', undefined, true, 10000],
    ['SCHEDULED', 'competition', undefined, true, false],
  ] as const)(
    'con estado %s, fase %s, intervalo %s e isFrozen=%s devuelve %s',
    (status, phase, interval, isFrozen, expected) => {
      expect(standingsRefetchInterval(status, phase, interval, isFrozen)).toBe(expected)
    },
  )
})

describe('useStandings finalizado sin revelar (mock)', () => {
  async function load(contestId: string) {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandings('group-1', contestId), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    return result.current.data!
  }

  beforeEach(() => {
    mockContestReveals.clear()
  })

  afterEach(() => {
    mockContests.splice(0, mockContests.length, ...structuredClone(initialContests))
  })

  it('marca como congelado un contest terminado con freeze que aún no se revela', async () => {
    const data = await load('contest-9')

    expect(data.contest.status).toBe('FINISHED')
    expect(data.contest.isFrozen).toBe(true)
    expect(data.contest.resultsRevealedAt).toBeNull()
    expect(data.contest.autoRevealAt).toBeNull()
  })

  it('no marca como congelado un contest terminado sin freeze', async () => {
    const data = await load('contest-3')

    expect(data.contest.isFrozen).toBe(false)
  })

  it('no sigue congelado cuando el revelado automático coincide con el fin de la competencia', async () => {
    const contest = mockContests.find((c) => c.id === 'contest-9')
    if (!contest) throw new Error('contest-9 no existe en el mock')
    contest.autoRevealMinutes = 0

    const data = await load('contest-9')

    expect(data.contest.isFrozen).toBe(false)
    expect(data.contest.autoRevealAt).toBe(data.contest.endTime)
  })
})

describe('useRevealContestResults', () => {
  async function loadFrozenStandings(contestId: string) {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandings('group-1', contestId), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    return result.current.data!
  }

  beforeEach(() => {
    mockContestReveals.clear()
  })

  it('revela los resultados de un contest congelado y sin revelar', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRevealContestResults(), { wrapper })

    result.current.mutate({ groupId: 'group-1', contestId: 'contest-9' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const data = await loadFrozenStandings('contest-9')
    expect(data.contest.isFrozen).toBe(false)
    expect(data.contest.resultsRevealedAt).toEqual(expect.any(String))
  })

  it('invalida standings, filtros y envíos del contest', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRevealContestResults(), { wrapper })

    result.current.mutate({ groupId: 'group-1', contestId: 'contest-9' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contests', 'standings', 'group-1', 'contest-9'] }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contests', 'standings-filter-options', 'group-1', 'contest-9'] }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contests', 'submissions', 'group-1', 'contest-9'] }),
    )
  })

  it.each([
    ['contest-2', 409, 'CONTEST_NOT_FINISHED'],
    ['contest-3', 409, 'CONTEST_HAS_NO_FREEZE'],
    ['contest-nope', 404, 'CONTEST_NOT_FOUND'],
  ] as const)('rechaza el contest %s con %s y código %s', async (contestId, status, code) => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRevealContestResults(), { wrapper })

    result.current.mutate({ groupId: 'group-1', contestId })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(ApiClientError)
    expect((result.current.error as ApiClientError).status).toBe(status)
    expect((result.current.error as ApiClientError).code).toBe(code)
  })

  it('rechaza con 403 a quien no es Lead ni Admin', async () => {
    setAccessToken('mock-jwt-token-carloscp')
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRevealContestResults(), { wrapper })

    result.current.mutate({ groupId: 'group-1', contestId: 'contest-9' })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(ApiClientError)
    expect((result.current.error as ApiClientError).status).toBe(403)
    expect((result.current.error as ApiClientError).code).toBe('INSUFFICIENT_PERMISSIONS')
  })
})

describe('useStandingsFilterOptions', () => {
  it('retorna opciones de filtro con países conocidos de mockStandings', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandingsFilterOptions('group-1', 'contest-2'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.countries[0]).toBe('Argentina')
    expect(result.current.data?.countries).toContain('Chile')
  })

  it('incluye ciudades e instituciones de las filas de post-competencia cuando están disponibles', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandingsFilterOptions('group-1', 'contest-8'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.cities).toContain('Cúcuta')
    expect(result.current.data?.institutions).toContain('UFPS')
  })

  it('no incluye valores de post-competencia en una competencia activa', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useStandingsFilterOptions('group-1', 'contest-2'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.cities).not.toContain('Cúcuta')
  })
})

describe('useContestSubmissions', () => {
  it('retorna envíos del concurso con el ID del concurso y el ID del primer envío correctos', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useContestSubmissions('group-1', 'contest-2'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.contest.id).toBe('contest-2')
    expect(result.current.data?.submissions[0].id).toBe('csub-004')
  })

  it('no hace fetch cuando algún ID está vacío', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useContestSubmissions('group-1', ''), { wrapper })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useContestSubmissions congelado (mock)', () => {
  beforeEach(() => mockContestReveals.clear())

  async function load(contestId: string, viewerToken = 'mock-jwt-token-carloscp') {
    setAccessToken(viewerToken)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useContestSubmissions('group-1', contestId), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    return result.current.data!
  }

  it('a un participante le oculta los veredictos de una competencia terminada y sin revelar', async () => {
    // Arrange / Act
    const data = await load('contest-9')

    // Assert
    expect(data.contest.inFreeze).toBe(true)
    expect(data.submissions.length).toBeGreaterThan(0)
    expect(data.submissions.every((submission) => submission.status === '?')).toBe(true)
  })

  it('no oculta nada a un admin aunque la competencia no se haya revelado', async () => {
    // Arrange / Act
    const data = await load('contest-9', 'mock-jwt-token-luisadmin')

    // Assert
    expect(data.contest.inFreeze).toBe(true)
    expect(data.submissions.some((submission) => submission.status === 'ACCEPTED')).toBe(true)
  })

  it('muestra los veredictos una vez revelados los resultados', async () => {
    // Arrange
    mockContestReveals.set('contest-9', new Date().toISOString())

    // Act
    const data = await load('contest-9')

    // Assert
    expect(data.contest.inFreeze).toBe(false)
    expect(data.submissions.some((submission) => submission.status === 'ACCEPTED')).toBe(true)
  })

  it('sigue ocultando los veredictos en una competencia activa dentro de su freeze', async () => {
    // Arrange / Act
    const data = await load('contest-6')

    // Assert
    expect(data.contest.inFreeze).toBe(true)
  })

  it('no marca congelada una competencia terminada sin freeze', async () => {
    // Arrange / Act
    const data = await load('contest-3')

    // Assert
    expect(data.contest.inFreeze).toBe(false)
  })
})

describe('useUpdateContest', () => {
  it('retorna el nombre actualizado, siembra el cache de detalle y marca contestKeys.all como stale', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateContest(), { wrapper })

    result.current.mutate({ groupId: 'group-1', contestId: 'contest-1', data: { name: 'Nombre Actualizado' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.name).toBe('Nombre Actualizado')
    const cached = queryClient.getQueryData(contestKeys.detail('group-1', 'contest-1'))
    expect((cached as { name?: string })?.name).toBe('Nombre Actualizado')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: contestKeys.all }))
  })

  it('conserva los problems del PUT en caché con el detalle activo sin refetch inmediato del detalle', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    // Montar el detalle primero para que la query esté activa como observador
    const { result: detailHook } = renderHook(
      () => useContestDetail('group-1', 'contest-1'),
      { wrapper },
    )
    await waitFor(() => expect(detailHook.current.isSuccess).toBe(true))

    const { result: mutHook } = renderHook(() => useUpdateContest(), { wrapper })
    mutHook.current.mutate({ groupId: 'group-1', contestId: 'contest-1', data: { name: 'Nombre Actualizado' } })
    await waitFor(() => expect(mutHook.current.isSuccess).toBe(true))

    // El cache tiene la respuesta del PUT con el array de problems intacto
    const cached = queryClient.getQueryData(contestKeys.detail('group-1', 'contest-1')) as {
      name?: string
      problems?: unknown[]
    } | undefined
    expect(cached?.name).toBe('Nombre Actualizado')
    expect(Array.isArray(cached?.problems)).toBe(true)

    // La invalidación del detalle usó refetchType:'none' para no disparar un GET inmediato
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: contestKeys.detail('group-1', 'contest-1'),
        refetchType: 'none',
      }),
    )
  })
})

describe('useDeleteContest', () => {
  it('invalida contestKeys.all al eliminar con éxito', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteContest(), { wrapper })

    result.current.mutate({ groupId: 'group-1', contestId: 'contest-1' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: contestKeys.all }))
  })

  it.each([
    ['contest-3', 403, 'CONTEST_LOCKED'],
    ['contest-2', 409, 'CONTEST_IS_ACTIVE'],
    ['no-existe', 404, 'CONTEST_NOT_FOUND'],
  ])('falla al eliminar %s con %i %s', async (contestId, status, code) => {
    // Arrange
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteContest(), { wrapper })

    // Act
    result.current.mutate({ groupId: 'group-1', contestId })
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Assert
    expect(result.current.error).toBeInstanceOf(ApiClientError)
    expect((result.current.error as ApiClientError).status).toBe(status)
    expect((result.current.error as ApiClientError).code).toBe(code)
  })
})

describe('useUpdateContest con colores de problemas', () => {
  beforeEach(() => {
    mockContests.splice(0, mockContests.length, ...structuredClone(initialContests))
  })

  it('conserva los colores cuando los items no traen color', async () => {
    // Arrange
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateContest(), { wrapper })

    // Act
    result.current.mutate({
      groupId: 'group-1',
      contestId: 'contest-2',
      data: { problems: [{ slug: 'two-sum', order: 1 }, { slug: 'binary-search', order: 2 }] },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    expect(result.current.data?.problems?.[0].color).toBe('#e11d48')
    expect(result.current.data?.problems?.[1].color).toBe('#2563eb')
  })

  it('guarda el color nuevo en minúsculas', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateContest(), { wrapper })

    result.current.mutate({
      groupId: 'group-1',
      contestId: 'contest-2',
      data: { problems: [{ slug: 'two-sum', order: 1, color: '#AABBCC' }] },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.problems?.[0].color).toBe('#aabbcc')
  })

  it('borra el color cuando se envía null', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateContest(), { wrapper })

    result.current.mutate({
      groupId: 'group-1',
      contestId: 'contest-2',
      data: { problems: [{ slug: 'two-sum', order: 1, color: null }] },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.problems?.[0].color).toBeNull()
  })

  it('fusiona la respuesta parcial del PUT con el detalle cacheado en vez de reemplazarlo', async () => {
    // Arrange: el backend real responde con `order`, sin límites y sin participantCount
    const { wrapper, queryClient } = makeWrapper()
    const detailKey = contestKeys.detail('group-1', 'contest-2')
    queryClient.setQueryData(detailKey, { ...structuredClone(mockContests[1]), participantCount: 18 })
    server.use(
      http.put('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
        HttpResponse.json({
          id: 'contest-2',
          problems: [
            { slug: 'two-sum', title: 'Two Sum', order: 1, color: '#aabbcc' },
            { slug: 'binary-search', title: 'Binary Search', order: 2, color: '#2563eb' },
          ],
        }),
      ),
    )
    const { result } = renderHook(() => useUpdateContest(), { wrapper })

    // Act
    result.current.mutate({
      groupId: 'group-1',
      contestId: 'contest-2',
      data: { problems: [{ slug: 'two-sum', order: 1, color: '#aabbcc' }, { slug: 'binary-search', order: 2 }] },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Assert
    const cached = queryClient.getQueryData<ContestDetail>(detailKey)
    expect(cached?.participantCount).toBe(18)
    expect(cached?.problems.map((p) => p.position)).toEqual([1, 2])
    expect(cached?.problems[0].timeLimit).toBe(2000)
    expect(cached?.problems[0].color).toBe('#aabbcc')
  })

  it('permite editar otros campos de una competencia finalizada', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateContest(), { wrapper })

    result.current.mutate({ groupId: 'group-1', contestId: 'contest-3', data: { name: 'Nuevo nombre' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.name).toBe('Nuevo nombre')
  })

  it.each(['red', '#fff'])('rechaza el color inválido %j con 400 INVALID_PROBLEM_COLOR', async (color) => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateContest(), { wrapper })

    result.current.mutate({
      groupId: 'group-1',
      contestId: 'contest-2',
      data: { problems: [{ slug: 'two-sum', order: 1, color }] },
    })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(ApiClientError)
    expect((result.current.error as ApiClientError).status).toBe(400)
    expect((result.current.error as ApiClientError).code).toBe('INVALID_PROBLEM_COLOR')
  })

  it('rechaza cambiar problemas de una competencia finalizada con 409 CONTEST_PROBLEMS_LOCKED', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateContest(), { wrapper })

    result.current.mutate({
      groupId: 'group-1',
      contestId: 'contest-3',
      data: { problems: [{ slug: 'two-sum', order: 1, color: '#112233' }] },
    })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(ApiClientError)
    expect((result.current.error as ApiClientError).status).toBe(409)
    expect((result.current.error as ApiClientError).code).toBe('CONTEST_PROBLEMS_LOCKED')
  })
})

describe('useRegisterToContest', () => {
  it('invalida registrationStatus, contestDetail y registrations al registrarse', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRegisterToContest(), { wrapper })

    result.current.mutate({ groupId: 'group-1', contestId: 'contest-1' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: contestKeys.registrationStatus('group-1', 'contest-1') }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: contestKeys.detail('group-1', 'contest-1') }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contests', 'registrations', 'group-1', 'contest-1'] }),
    )
  })
})

describe('useUnregisterFromContest', () => {
  it('invalida registrationStatus, contestDetail y registrations al darse de baja', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUnregisterFromContest(), { wrapper })

    result.current.mutate({ groupId: 'group-1', contestId: 'contest-1' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: contestKeys.registrationStatus('group-1', 'contest-1') }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: contestKeys.detail('group-1', 'contest-1') }),
    )
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contests', 'registrations', 'group-1', 'contest-1'] }),
    )
  })
})
