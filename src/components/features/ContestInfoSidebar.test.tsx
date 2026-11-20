import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'

import { mockContests } from '@/mocks/data'
import { renderWithRouter } from '@/test/renderWithProviders'
import type { ContestDetail } from '@/types/contest'

import { ContestInfoSidebar } from './ContestInfoSidebar'

function contestWith(overrides: Partial<ContestDetail>): ContestDetail {
  const base = mockContests.find((c) => c.id === 'contest-2')
  if (!base) throw new Error('contest-2 missing from mocks')
  return { ...base, ...overrides }
}

describe('ContestInfoSidebar', () => {
  it('muestra la fila Inscripción tardía como Habilitada cuando el flag está activo', () => {
    renderWithRouter(<ContestInfoSidebar contest={contestWith({ allowLateRegistration: true })} />)

    expect(screen.getByText('Inscripción tardía')).toBeInTheDocument()
    expect(screen.getByText('Habilitada')).toBeInTheDocument()
  })

  it('no muestra la fila cuando el flag está apagado', () => {
    renderWithRouter(<ContestInfoSidebar contest={contestWith({ allowLateRegistration: false })} />)

    expect(screen.queryByText('Inscripción tardía')).not.toBeInTheDocument()
  })
})
