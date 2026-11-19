import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { StandingEntry, StandingsProblem } from '@/types/contest'
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

function renderTable(tableProblems = problems, tableEntries = entries) {
  render(
    <MemoryRouter>
      <StandingsTable problems={tableProblems} entries={tableEntries} />
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
