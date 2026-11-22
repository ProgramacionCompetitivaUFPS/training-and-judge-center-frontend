import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { AuthContext } from '@/hooks/useAuth'
import { ContestSessionContext } from '@/components/layout/ContestSessionProvider'
import { mockContests, mockCurrentUser } from '@/mocks/data'
import type { ContestDetail } from '@/types/contest'
import type { UserRole } from '@/types/user'
import { Sidebar } from './Sidebar'

const activeContest = mockContests.find((c) => c.id === 'contest-2') as ContestDetail

interface RenderOptions {
  path?: string
  role?: UserRole
  contest?: ContestDetail
  onClose?: () => void
}

function renderSidebar({ path = '/dashboard', role = 'CONTESTANT', contest, onClose = vi.fn() }: RenderOptions = {}) {
  const authValue = {
    user: { ...mockCurrentUser, role },
    isLoading: false,
    isAuthenticated: true,
    lastNickname: mockCurrentUser.nickname,
    logout: vi.fn(),
    hasRole: (wanted: UserRole | UserRole[]) => (Array.isArray(wanted) ? wanted : [wanted]).includes(role),
  }
  const session = {
    contestId: contest?.id ?? null,
    groupId: contest?.group.id ?? null,
    contest,
    isLoading: false,
  }
  render(
    <AuthContext.Provider value={authValue}>
      <ContestSessionContext.Provider value={session}>
        <MemoryRouter initialEntries={[path]}>
          <Sidebar isOpen onClose={onClose} />
        </MemoryRouter>
      </ContestSessionContext.Provider>
    </AuthContext.Provider>,
  )
  return { onClose }
}

describe('Sidebar', () => {
  it.each([
    ['Dashboard', '/dashboard'],
    ['Problemas', '/problems'],
    ['Grupos', '/groups'],
    ['Competencias', '/contests'],
    ['Mis Envíos', '/submissions'],
    ['Equipos', '/teams'],
    ['Configuración', '/settings'],
  ])('muestra el enlace %s hacia %s', (label, href) => {
    renderSidebar()

    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href)
  })

  it('marca como página actual solo la sección que coincide con la URL', () => {
    renderSidebar({ path: '/problems/two-sum' })

    expect(screen.getByRole('link', { name: 'Problemas' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Grupos' })).not.toHaveAttribute('aria-current')
  })

  it('marca el Dashboard como actual también en la raíz /', () => {
    renderSidebar({ path: '/' })

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
  })

  it('muestra el enlace de administración de usuarios solo al ADMIN', () => {
    renderSidebar({ role: 'ADMIN' })

    expect(screen.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('href', '/admin/users')
  })

  it.each([['COACH'], ['CONTESTANT']] as Array<[UserRole]>)('oculta el enlace de usuarios para el rol %s', (role) => {
    renderSidebar({ role })

    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
  })

  it('llama a onClose al pulsar un enlace de navegación', async () => {
    const { onClose } = renderSidebar()

    await userEvent.setup().click(screen.getByRole('link', { name: 'Problemas' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('llama a onClose al pulsar el botón de cerrar', async () => {
    const { onClose } = renderSidebar()

    await userEvent.setup().click(screen.getByRole('button'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  describe('modo competencia', () => {
    it('muestra el nombre, los problemas y los accesos rápidos de la competencia en curso', () => {
      renderSidebar({ contest: activeContest, path: '/groups/group-1/contests/contest-2' })

      expect(screen.getByRole('link', { name: 'Práctica Grafos' })).toHaveAttribute('href', '/groups/group-1/contests/contest-2')
      expect(screen.getByRole('link', { name: 'A' })).toHaveAttribute('href', '/groups/group-1/contests/contest-2/problems/A')
      expect(screen.getByRole('link', { name: 'B' })).toHaveAttribute('title', 'Binary Search')
      expect(screen.getByRole('link', { name: 'C' })).toHaveAttribute('href', '/groups/group-1/contests/contest-2/problems/C')
      expect(screen.getByRole('link', { name: 'Tabla de Posiciones' })).toHaveAttribute(
        'href',
        '/groups/group-1/contests/contest-2/standings',
      )
      expect(screen.getByRole('link', { name: 'Envíos' })).toHaveAttribute(
        'href',
        '/groups/group-1/contests/contest-2/submissions',
      )
    })

    it.each([['SCHEDULED'], ['FINISHED']] as Array<[ContestDetail['status']]>)(
      'no muestra el panel de competencia cuando está %s',
      (status) => {
        renderSidebar({ contest: { ...activeContest, status } })

        expect(screen.queryByRole('link', { name: 'Tabla de Posiciones' })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Práctica Grafos' })).not.toBeInTheDocument()
      },
    )

    it('no muestra el bloque de problemas cuando la competencia no tiene ninguno', () => {
      renderSidebar({ contest: { ...activeContest, problems: [], problemCount: 0 } })

      expect(screen.getByRole('link', { name: 'Tabla de Posiciones' })).toBeInTheDocument()
      expect(screen.queryByText('Problemas', { selector: 'p' })).not.toBeInTheDocument()
    })
  })
})
