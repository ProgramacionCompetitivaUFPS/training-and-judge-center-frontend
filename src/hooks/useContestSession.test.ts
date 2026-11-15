import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { ContestSessionContext } from '@/components/layout/ContestSessionProvider'
import { mockContests } from '@/mocks/data'
import { useContestSession } from './useContestSession'

describe('useContestSession', () => {
  it('retorna los valores por defecto cuando no hay provider', () => {
    const { result } = renderHook(() => useContestSession())

    expect(result.current.contestId).toBeNull()
    expect(result.current.groupId).toBeNull()
    expect(result.current.contest).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
  })

  it('retorna contestId y groupId desde el provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ContestSessionContext.Provider, {
        value: { contestId: 'contest-2', groupId: 'group-1', contest: undefined, isLoading: false },
        children,
      })

    const { result } = renderHook(() => useContestSession(), { wrapper })

    expect(result.current.contestId).toBe('contest-2')
    expect(result.current.groupId).toBe('group-1')
  })

  it('retorna el objeto contest completo desde el provider', () => {
    const contest = mockContests.find((c) => c.id === 'contest-1')!
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ContestSessionContext.Provider, {
        value: { contestId: 'contest-1', groupId: 'group-1', contest, isLoading: false },
        children,
      })

    const { result } = renderHook(() => useContestSession(), { wrapper })

    expect(result.current.contest).toBeDefined()
    expect(result.current.contest?.id).toBe('contest-1')
    expect(result.current.contest?.name).toBe('Competencia Semanal #12')
  })

  it('refleja isLoading true cuando el provider está cargando', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ContestSessionContext.Provider, {
        value: { contestId: null, groupId: null, contest: undefined, isLoading: true },
        children,
      })

    const { result } = renderHook(() => useContestSession(), { wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.contest).toBeUndefined()
  })

  it('retorna todos los campos correctamente cuando hay una competencia en curso', () => {
    const contest = mockContests.find((c) => c.id === 'contest-1')!
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(ContestSessionContext.Provider, {
        value: { contestId: 'contest-1', groupId: 'group-1', contest, isLoading: false },
        children,
      })

    const { result } = renderHook(() => useContestSession(), { wrapper })

    expect(result.current.contestId).toBe('contest-1')
    expect(result.current.groupId).toBe('group-1')
    expect(result.current.contest?.id).toBe('contest-1')
    expect(result.current.contest?.name).toBe('Competencia Semanal #12')
    expect(result.current.isLoading).toBe(false)
  })
})
