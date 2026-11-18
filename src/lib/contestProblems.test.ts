import { describe, it, expect } from 'vitest'

import type { ContestProblem } from '@/types/contest'

import { buildColorUpdatePayload } from './contestProblems'

const problems: ContestProblem[] = [
  { position: 1, slug: 'two-sum', title: 'Two Sum', timeLimit: 2000, memoryLimit: 256, color: '#e11d48' },
  { position: 2, slug: 'binary-search', title: 'Binary Search', timeLimit: 1000, memoryLimit: 128, color: null },
  { position: 3, slug: 'graph-bfs', title: 'Graph BFS', timeLimit: 2000, memoryLimit: 256 },
]

describe('buildColorUpdatePayload', () => {
  it('manda color solo en el problema cambiado y omite la clave en los demás', () => {
    // Act
    const result = buildColorUpdatePayload(problems, { 'two-sum': '#112233' })

    // Assert
    expect(result).toEqual([
      { slug: 'two-sum', order: 1, color: '#112233' },
      { slug: 'binary-search', order: 2 },
      { slug: 'graph-bfs', order: 3 },
    ])
    expect(result?.[1]).not.toHaveProperty('color')
    expect(result?.[2]).not.toHaveProperty('color')
  })

  it('normaliza el color nuevo a minúsculas', () => {
    const result = buildColorUpdatePayload(problems, { 'binary-search': '#AABBCC' })

    expect(result?.[1]).toEqual({ slug: 'binary-search', order: 2, color: '#aabbcc' })
  })

  it('ordena por posición y renumera order desde 1', () => {
    // Arrange
    const unsorted: ContestProblem[] = [problems[2], problems[0], problems[1]]

    // Act
    const result = buildColorUpdatePayload(unsorted, { 'graph-bfs': '#112233' })

    // Assert
    expect(result).toEqual([
      { slug: 'two-sum', order: 1 },
      { slug: 'binary-search', order: 2 },
      { slug: 'graph-bfs', order: 3, color: '#112233' },
    ])
  })

  it('no muta el arreglo recibido', () => {
    const unsorted: ContestProblem[] = [problems[2], problems[0], problems[1]]

    buildColorUpdatePayload(unsorted, { 'graph-bfs': '#112233' })

    expect(unsorted.map((p) => p.slug)).toEqual(['graph-bfs', 'two-sum', 'binary-search'])
  })

  it.each([
    ['no hay colores elegidos', {}],
    ['el color es el mismo que el guardado con otra capitalización', { 'two-sum': '#E11D48' }],
    ['se elige blanco en un problema sin color (null)', { 'binary-search': '#FFFFFF' }],
    ['se elige blanco en un problema sin color (ausente)', { 'graph-bfs': '#ffffff' }],
    ['el color elegido es inválido', { 'two-sum': 'red' }],
    ['el slug no existe en la competencia', { 'no-existe': '#112233' }],
  ])('retorna null cuando %s', (_caso, colors) => {
    expect(buildColorUpdatePayload(problems, colors)).toBeNull()
  })
})
