import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { StandingEntry, StandingsPhase, StandingsProblem } from '@/types/contest'
import { StandingsTable } from './StandingsTable'

const problems: StandingsProblem[] = [
  { position: 1, slug: 'two-sum', title: 'Two Sum', color: '#e11d48', accepted: 4, tried: 5 },
  { position: 2, slug: 'binary-search', title: 'Binary Search', color: '#2563eb', accepted: 3, tried: 4 },
  { position: 3, slug: 'graph-bfs', title: 'Graph BFS', color: null, accepted: 3, tried: 5 },
]

const entries: StandingEntry[] = [
  {
    rank: 1,
    participant: {
      id: 'team-1',
      type: 'TEAM',
      displayName: 'Competitive Coders',
      members: ['luisadmin', 'carloscp', 'anagarcia'],
    },
    problemsSolved: 3,
    totalPenalty: 110,
    problems: [
      { position: 1, status: 'ACCEPTED', attempts: 1, time: 20, penalty: 0, isFirstSolve: true },
      { position: 2, status: 'ACCEPTED', attempts: 1, time: 45, penalty: 0 },
      { position: 3, status: 'ACCEPTED', attempts: 2, time: 75, penalty: 20 },
    ],
  },
  {
    rank: 2,
    participant: {
      id: 'u3',
      type: 'INDIVIDUAL',
      displayName: 'carloscp',
      nickname: 'carloscp',
      institution: 'UBA',
    },
    problemsSolved: 2,
    totalPenalty: 125,
    problems: [
      { position: 1, status: 'ACCEPTED', attempts: 1, time: 30, penalty: 0 },
      { position: 2, status: 'WRONG_ANSWER', attempts: 4, time: null, penalty: 0 },
      { position: 3, status: 'NOT_ATTEMPTED', attempts: 0, time: null, penalty: 0 },
    ],
  },
  {
    rank: 3,
    participant: { id: 'u9', type: 'INDIVIDUAL', displayName: 'anonimo' },
    problemsSolved: 0,
    totalPenalty: 0,
    problems: [{ position: 1, status: 'PENDING', attempts: 1, time: null, penalty: 0 }],
  },
]

const postEntries: StandingEntry[] = [
  {
    rank: null,
    isOfficial: false,
    participant: { id: 'u-post-1', type: 'INDIVIDUAL', displayName: 'lauramendez', nickname: 'lauramendez' },
    problemsSolved: 2,
    totalPenalty: 0,
    problems: [
      { position: 1, status: 'ACCEPTED', attempts: 1, time: null, penalty: 0 },
      { position: 2, status: 'ACCEPTED', attempts: 3, time: null, penalty: 0 },
      { position: 3, status: 'NOT_ATTEMPTED', attempts: 0, time: null, penalty: 0 },
    ],
  },
  {
    rank: null,
    isOfficial: false,
    participant: { id: 'u-post-2', type: 'INDIVIDUAL', displayName: 'andresrojas', nickname: 'andresrojas' },
    problemsSolved: 1,
    totalPenalty: 0,
    problems: [
      { position: 1, status: 'NOT_ATTEMPTED', attempts: 0, time: null, penalty: 0 },
      { position: 2, status: 'NOT_ATTEMPTED', attempts: 0, time: null, penalty: 0 },
      { position: 3, status: 'ACCEPTED', attempts: 1, time: null, penalty: 0 },
    ],
  },
  {
    rank: null,
    isOfficial: false,
    participant: { id: 'u-post-3', type: 'INDIVIDUAL', displayName: 'carlosvega', nickname: 'carlosvega' },
    problemsSolved: 0,
    totalPenalty: 0,
    problems: [
      { position: 1, status: 'WRONG_ANSWER', attempts: 2, time: null, penalty: 0 },
      { position: 2, status: 'NOT_ATTEMPTED', attempts: 0, time: null, penalty: 0 },
      { position: 3, status: 'NOT_ATTEMPTED', attempts: 0, time: null, penalty: 0 },
    ],
  },
]

function renderTable(tableProblems = problems, tableEntries = entries, phase?: StandingsPhase) {
  render(
    <MemoryRouter>
      <StandingsTable problems={tableProblems} entries={tableEntries} phase={phase} />
    </MemoryRouter>,
  )
}

describe('StandingsTable', () => {
  it('muestra un globo con la letra de cada problema en el encabezado', () => {
    renderTable()

    for (const letter of ['A', 'B', 'C']) {
      expect(screen.getByRole('columnheader', { name: letter })).toBeInTheDocument()
    }
    const bodies = screen.getAllByTestId('balloon-icon-body')
    expect(bodies[0]).toHaveAttribute('fill', '#e11d48')
    expect(bodies[1]).toHaveAttribute('fill', '#2563eb')
    expect(bodies[2]).toHaveAttribute('fill', '#ffffff')
    expect(screen.getAllByTestId('balloon-icon-letter')[0]).toHaveTextContent('A')
  })

  it('pinta de blanco el globo cuando el color es inválido', () => {
    renderTable([{ position: 1, slug: 'two-sum', title: 'Two Sum', color: 'red' }], [])

    expect(screen.getByTestId('balloon-icon-body')).toHaveAttribute('fill', '#ffffff')
  })

  it('muestra equipo con su etiqueta, miembros, resueltos y penalización', () => {
    renderTable()

    const row = screen.getByText('Competitive Coders').closest('tr')!
    expect(within(row).getByText('Equipo')).toBeInTheDocument()
    expect(within(row).getByText('luisadmin, carloscp, anagarcia')).toBeInTheDocument()
    expect(within(row).getByText('110')).toBeInTheDocument()
    expect(within(row).getByText('3')).toBeInTheDocument()
  })

  it('formatea la hora del AC y los intentos previos', () => {
    renderTable()

    expect(screen.getByText('00:20')).toBeInTheDocument()
    expect(screen.getByText('01:15')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('resalta solo la celda del primer AC', () => {
    renderTable()

    expect(screen.getByText('00:20').closest('td')).toHaveAttribute('data-first-solve', 'true')
    expect(screen.getByText('00:30').closest('td')).not.toHaveAttribute('data-first-solve')
  })

  it('muestra WA en rojo, sin intentos y pendiente', () => {
    renderTable()

    expect(screen.getByText('-4')).toHaveClass('text-status-error')
    expect(screen.getAllByLabelText('Sin intentos').length).toBeGreaterThan(0)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('enlaza al perfil cuando hay nickname y no cuando falta', () => {
    renderTable()

    expect(screen.getByRole('link', { name: 'carloscp' })).toHaveAttribute('href', '/users/carloscp')
    expect(screen.getByText('anonimo')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'anonimo' })).not.toBeInTheDocument()
  })

  it('muestra el pie de Aceptados e Intentos cuando todos los problemas traen contadores', () => {
    renderTable()

    expect(screen.getByText('Aceptados')).toBeInTheDocument()
    expect(screen.getByText('Intentos')).toBeInTheDocument()
  })

  it('oculta el pie cuando algún problema no trae contadores', () => {
    renderTable([{ position: 1, slug: 'two-sum', title: 'Two Sum', color: null }], [])

    expect(screen.queryByText('Aceptados')).not.toBeInTheDocument()
  })

  it('no muestra NaN, null ni undefined cuando el AC no trae hora', () => {
    renderTable(
      [{ position: 1, slug: 'two-sum', title: 'Two Sum' }],
      [
        {
          rank: 1,
          participant: { id: 'u1', type: 'INDIVIDUAL', displayName: 'sinhora' },
          problemsSolved: 1,
          totalPenalty: 0,
          problems: [{ position: 1, status: 'ACCEPTED', attempts: 1, time: null, penalty: 0 }],
        },
      ],
    )

    const cell = screen.getByText('+').closest('td')!
    expect(cell).not.toHaveTextContent(/NaN|null|undefined/)
  })

  it('rellena con celdas vacías cuando la fila trae menos resultados que problemas', () => {
    renderTable()

    const row = screen.getByText('anonimo').closest('tr')!
    expect(within(row).getAllByRole('cell')).toHaveLength(7)
    expect(within(row).getAllByLabelText('Sin intentos')).toHaveLength(2)
  })

  it('renderiza solo las columnas fijas cuando no hay problemas ni filas', () => {
    renderTable([], [])

    expect(screen.getByRole('columnheader', { name: 'Participante' })).toBeInTheDocument()
    expect(screen.queryByText('Aceptados')).not.toBeInTheDocument()
  })
})

describe('StandingsTable con post-competencia', () => {
  afterEach(() => vi.restoreAllMocks())

  it('muestra una franja Post-competencia y las filas de post con su asterisco', () => {
    // Arrange / Act
    renderTable(problems, [...entries, ...postEntries])

    // Assert
    expect(screen.getAllByRole('row', { name: 'Post-competencia' })).toHaveLength(1)
    expect(screen.getByText('* lauramendez')).toBeInTheDocument()
    expect(screen.getByText('* andresrojas')).toBeInTheDocument()
    expect(screen.getByText('* carlosvega')).toBeInTheDocument()
    expect(screen.queryByText('null')).not.toBeInTheDocument()
  })

  it('muestra — como penalización y el AC en +N sin hora en una fila de post', () => {
    // Arrange
    renderTable(problems, [...entries, ...postEntries])
    const row = screen.getByText('* lauramendez').closest('tr')!

    // Act / Assert
    expect(within(row).getByText('—')).toBeInTheDocument()
    expect(within(row).getByText('+2')).toHaveClass('text-brand-accent')
    expect(row).not.toHaveTextContent(/\d{2}:\d{2}/)
  })

  it('muestra 0 resueltos, — y -N en rojo para una fila de post sin aciertos', () => {
    // Arrange
    renderTable(problems, [...entries, ...postEntries])
    const row = screen.getByText('* carlosvega').closest('tr')!

    // Act / Assert
    expect(within(row).getByText('0')).toBeInTheDocument()
    expect(within(row).getByText('—')).toBeInTheDocument()
    expect(within(row).getByText('-2')).toHaveClass('text-status-error')
    expect(row).not.toHaveTextContent(/NaN/)
  })

  it('muestra la franja una sola vez y antes de la primera fila de post cuando la tabla empieza en post', () => {
    // Arrange / Act
    renderTable(problems, postEntries)
    const strip = screen.getByRole('row', { name: 'Post-competencia' })
    const firstPostRow = screen.getByText('* lauramendez').closest('tr')!

    // Assert
    expect(screen.getAllByRole('row', { name: 'Post-competencia' })).toHaveLength(1)
    expect(strip.compareDocumentPosition(firstPostRow) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })

  it('no muestra la franja cuando solo hay filas oficiales', () => {
    renderTable(problems, entries)

    expect(screen.queryByRole('row', { name: 'Post-competencia' })).not.toBeInTheDocument()
  })

  it('deja vacía la celda de rank cuando la fila oficial no tiene rank', () => {
    // Arrange
    const unranked: StandingEntry[] = [{ ...entries[0], rank: null }]
    renderTable(problems, unranked)

    // Act
    const row = screen.getByText('Competitive Coders').closest('tr')!

    // Assert
    expect(row).not.toHaveTextContent('null')
    expect(within(row).getAllByRole('cell')[0]).toBeEmptyDOMElement()
  })

  it('muestra dos filas cuando el mismo participante aparece en oficial y en post', () => {
    // Arrange
    const samePlayerInPost: StandingEntry = {
      ...postEntries[0],
      participant: { id: 'u3', type: 'INDIVIDUAL', displayName: 'carloscp', nickname: 'carloscp' },
    }

    // Act
    renderTable(problems, [entries[1], samePlayerInPost])

    // Assert
    expect(screen.getByRole('link', { name: 'carloscp' })).toBeInTheDocument()
    expect(screen.getByText('* carloscp')).toBeInTheDocument()
  })

  it('no repite keys de React cuando el mismo participante tiene fila oficial y de post', () => {
    // Arrange
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const samePlayerInPost: StandingEntry = {
      ...postEntries[0],
      participant: { id: 'u3', type: 'INDIVIDUAL', displayName: 'carloscp', nickname: 'carloscp' },
    }

    // Act
    renderTable(problems, [entries[1], samePlayerInPost])

    // Assert
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('same key')
  })

  it('no resalta el primer AC en una fila de post aunque venga marcado', () => {
    // Arrange
    const firstSolveInPost: StandingEntry = {
      ...postEntries[0],
      problems: [{ position: 1, status: 'ACCEPTED', attempts: 1, time: null, penalty: 0, isFirstSolve: true }],
    }

    // Act
    renderTable(problems, [firstSolveInPost])
    const row = screen.getByText('* lauramendez').closest('tr')!

    // Assert
    for (const cell of within(row).getAllByRole('cell')) {
      expect(cell).not.toHaveAttribute('data-first-solve')
    }
  })

  it.each<[StandingsPhase | undefined, string, string]>([
    ['all', 'Aceptados (oficial)', 'Intentos (oficial)'],
    ['postcompetition', 'Aceptados (post-competencia)', 'Intentos (post-competencia)'],
    ['competition', 'Aceptados', 'Intentos'],
    [undefined, 'Aceptados', 'Intentos'],
  ])('con la fase %s rotula el pie como %s e %s', (phase, accepted, tried) => {
    renderTable(problems, entries, phase)

    expect(screen.getByText(accepted)).toBeInTheDocument()
    expect(screen.getByText(tried)).toBeInTheDocument()
  })
})

describe('StandingsTable con contadores de post-competencia', () => {
  const problemsWithPost: StandingsProblem[] = [
    { ...problems[0], postAccepted: 2, postTried: 3 },
    { ...problems[1], postAccepted: 0, postTried: 1 },
    { ...problems[2], postAccepted: 0, postTried: 0 },
  ]

  function footerCounters(label: string) {
    const row = screen.getByText(label).closest('tr')!
    return within(row)
      .getAllByRole('cell')
      .slice(4)
      .map((cell) => cell.textContent)
  }

  it('suma aparte los de post-competencia en la fase Todas y solo donde hay', () => {
    // Arrange / Act
    renderTable(problemsWithPost, entries, 'all')

    // Assert
    expect(footerCounters('Aceptados')).toEqual(['4 (+2)', '3', '3'])
    expect(footerCounters('Intentos')).toEqual(['5 (+3)', '4 (+1)', '5'])
  })

  it('explica en un tooltip cuántos son oficiales y cuántos de post-competencia', () => {
    renderTable(problemsWithPost, entries, 'all')

    expect(screen.getAllByTitle('4 oficiales + 2 de post-competencia')).toHaveLength(1)
  })

  it('muestra solo los contadores de post-competencia en la fase Post-competencia', () => {
    // Arrange / Act
    renderTable(problemsWithPost, entries, 'postcompetition')

    // Assert
    expect(footerCounters('Aceptados (post-competencia)')).toEqual(['2', '0', '0'])
    expect(footerCounters('Intentos (post-competencia)')).toEqual(['3', '1', '0'])
  })

  it('muestra solo los oficiales en la fase Competencia aunque lleguen los de post', () => {
    // Arrange / Act
    renderTable(problemsWithPost, entries, 'competition')

    // Assert
    expect(footerCounters('Aceptados')).toEqual(['4', '3', '3'])
    expect(screen.queryByText(/\(\+/)).not.toBeInTheDocument()
  })

  it('no muestra sumas cuando la competencia no tiene fase post (todos en 0)', () => {
    // Arrange
    const noPost = problems.map((p) => ({ ...p, postAccepted: 0, postTried: 0 }))

    // Act
    renderTable(noPost, entries, 'all')

    // Assert
    expect(footerCounters('Aceptados')).toEqual(['4', '3', '3'])
    expect(screen.queryByText(/\(\+/)).not.toBeInTheDocument()
  })

  it('usa accepted y tried en la fase Post-competencia cuando el backend no manda los de post', () => {
    // Arrange / Act
    renderTable(problems, entries, 'postcompetition')

    // Assert
    expect(footerCounters('Aceptados (post-competencia)')).toEqual(['4', '3', '3'])
  })
})
