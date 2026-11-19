import { describe, it, expect } from 'vitest'

import type { ContestDetail, ContestProblem } from '@/types/contest'

import { buildColorUpdatePayload, mergeContestUpdate } from './contestProblems'
import { mockContests } from '@/mocks/data'

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

  it('manda color null al quitar el color de un problema que lo tenía', () => {
    const result = buildColorUpdatePayload(problems, { 'two-sum': null })

    expect(result).toEqual([
      { slug: 'two-sum', order: 1, color: null },
      { slug: 'binary-search', order: 2 },
      { slug: 'graph-bfs', order: 3 },
    ])
  })

  it.each([
    ['no hay colores elegidos', {}],
    ['se quita el color de un problema sin color (null)', { 'binary-search': null }],
    ['se quita el color de un problema sin color (ausente)', { 'graph-bfs': null }],
    ['el color es el mismo que el guardado con otra capitalización', { 'two-sum': '#E11D48' }],
    ['se elige blanco en un problema sin color (null)', { 'binary-search': '#FFFFFF' }],
    ['se elige blanco en un problema sin color (ausente)', { 'graph-bfs': '#ffffff' }],
    ['el color elegido es inválido', { 'two-sum': 'red' }],
    ['el slug no existe en la competencia', { 'no-existe': '#112233' }],
  ])('retorna null cuando %s', (_caso, colors) => {
    expect(buildColorUpdatePayload(problems, colors)).toBeNull()
  })
})

describe('mergeContestUpdate', () => {
  // La respuesta real del PUT no es un contest completo: los problemas traen `order` (no `position`),
  // sin límites, y faltan campos como participantCount.
  const previous: ContestDetail = { ...structuredClone(mockContests[1]), participantCount: 18 }

  it('conserva los campos que el PUT no devuelve (participantCount, isRegistered, límites)', () => {
    // Act
    const merged = mergeContestUpdate(previous, {
      id: 'contest-2',
      name: 'Práctica Grafos 2',
      problems: [
        { slug: 'two-sum', title: 'Two Sum', order: 1, color: '#aabbcc' },
        { slug: 'binary-search', title: 'Binary Search', order: 2, color: '#2563eb' },
        { slug: 'graph-bfs', title: 'Graph BFS', order: 3, color: null },
      ],
    })

    // Assert
    expect(merged?.name).toBe('Práctica Grafos 2')
    expect(merged?.participantCount).toBe(18)
    expect(merged?.isRegistered).toBe(true)
    expect(merged?.problems[0]).toEqual({
      position: 1,
      slug: 'two-sum',
      title: 'Two Sum',
      timeLimit: 2000,
      memoryLimit: 256,
      color: '#aabbcc',
    })
  })

  it('usa order como position, sin dejar la clave order en el resultado', () => {
    const merged = mergeContestUpdate(previous, {
      problems: [{ slug: 'graph-bfs', title: 'Graph BFS', order: 1, color: null }],
    })

    expect(merged?.problems).toHaveLength(1)
    expect(merged?.problems[0].position).toBe(1)
    expect(merged?.problems[0]).not.toHaveProperty('order')
  })

  it('prefiere position cuando la respuesta ya lo trae', () => {
    const merged = mergeContestUpdate(previous, {
      problems: [{ slug: 'two-sum', title: 'Two Sum', position: 3, order: 1 }],
    })

    expect(merged?.problems[0].position).toBe(3)
  })

  it('mantiene los problemas anteriores cuando la respuesta no trae problems', () => {
    const merged = mergeContestUpdate(previous, { id: 'contest-2', name: 'Solo el nombre' })

    expect(merged?.name).toBe('Solo el nombre')
    expect(merged?.problems.map((p) => p.slug)).toEqual(['two-sum', 'binary-search', 'graph-bfs'])
  })

  it('retorna undefined cuando no hay contest previo en el caché', () => {
    expect(mergeContestUpdate(undefined, { id: 'contest-2', name: 'X' })).toBeUndefined()
  })
})
