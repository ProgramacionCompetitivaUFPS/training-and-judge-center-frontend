import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamContestRegistration } from './TeamContestRegistration'
import type { MyTeamItem } from '@/types/team'

const mockTeam: MyTeamItem = {
  id: 'team-1',
  name: 'Equipo Alpha',
  memberCount: 3,
  role: 'CAPTAIN',
  isActive: true,
  groupId: 'group-1',
}

const baseProps = {
  contestId: 'contest-1',
  contestStatus: 'SCHEDULED',
  participationMode: 'TEAM',
  isRegistered: false,
  teams: [mockTeam],
  isLoadingTeams: false,
  eligibility: undefined,
  isLoadingEligibility: false,
  isFetchingEligibility: false,
  eligibilityFailed: false,
  onRetryEligibility: vi.fn(),
  myRegistration: undefined,
  currentUserNickname: 'luisadmin',
  onRegisterTeam: vi.fn(),
  onUpdateTeamRegistration: vi.fn(),
  onUnregisterTeam: vi.fn(),
  isRegistering: false,
  isUpdating: false,
  isUnregistering: false,
  registrationError: undefined,
  onTeamSelect: vi.fn(),
}

function renderComp(overrides?: Partial<typeof baseProps>) {
  const props = { ...baseProps, ...overrides }
  const { container } = render(<TeamContestRegistration {...props} />)
  return container
}

describe('TeamContestRegistration', () => {
  it('no renderiza nada cuando el estado no permite registro ni gestión', () => {
    const container = renderComp({ contestStatus: 'ACTIVE', isRegistered: true, myRegistration: undefined })
    expect(container.firstChild).toBeNull()
  })

  it('muestra el botón de registrar equipo cuando el concurso está programado y no hay registro', () => {
    renderComp()
    expect(screen.getByRole('button', { name: /Registrar equipo/ })).toBeInTheDocument()
  })

  it('abre el dialog al hacer click en Registrar equipo', async () => {
    const user = userEvent.setup()
    renderComp()
    await user.click(screen.getByRole('button', { name: /Registrar equipo/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Registrar equipo a la competencia')).toBeInTheDocument()
  })

  it('muestra la lista de equipos en el dialog al abrir', async () => {
    const user = userEvent.setup()
    renderComp()
    await user.click(screen.getByRole('button', { name: /Registrar equipo/ }))
    expect(screen.getByText('Seleccionar equipo')).toBeInTheDocument()
  })

  it('muestra el card de equipo registrado cuando hay myRegistration', () => {
    const myRegistration = {
      team: { id: 'team-1', name: 'Equipo Alpha' },
      selectedMembers: [
        { id: 'u-1', nickname: 'luisadmin', name: 'Luis Admin' },
        { id: 'u-2', nickname: 'mariacoach', name: 'Maria Coach' },
      ],
    } as Parameters<typeof TeamContestRegistration>[0]['myRegistration'] & {}

    renderComp({ myRegistration: myRegistration as NonNullable<typeof myRegistration>, isRegistered: true })
    expect(screen.getByText('Tu equipo está registrado')).toBeInTheDocument()
    expect(screen.getByText(/Equipo Alpha/)).toBeInTheDocument()
  })

  it('abre el ConfirmDialog de cancelar registro al hacer click', async () => {
    const user = userEvent.setup()
    const myRegistration = {
      team: { id: 'team-1', name: 'Equipo Alpha' },
      selectedMembers: [
        { id: 'u-1', nickname: 'luisadmin', name: 'Luis Admin' },
        { id: 'u-2', nickname: 'mariacoach', name: 'Maria Coach' },
      ],
    } as Parameters<typeof TeamContestRegistration>[0]['myRegistration'] & {}

    renderComp({ myRegistration: myRegistration as NonNullable<typeof myRegistration>, isRegistered: true })
    await user.click(screen.getByRole('button', { name: 'Cancelar registro' }))
    expect(screen.getByText('Cancelar registro del equipo')).toBeInTheDocument()
  })

  it('llama onUnregisterTeam al confirmar cancelación', async () => {
    const user = userEvent.setup()
    const onUnregisterTeam = vi.fn()
    const myRegistration = {
      team: { id: 'team-1', name: 'Equipo Alpha' },
      selectedMembers: [
        { id: 'u-1', nickname: 'luisadmin', name: 'Luis Admin' },
        { id: 'u-2', nickname: 'mariacoach', name: 'Maria Coach' },
      ],
    } as Parameters<typeof TeamContestRegistration>[0]['myRegistration'] & {}

    renderComp({
      myRegistration: myRegistration as NonNullable<typeof myRegistration>,
      isRegistered: true,
      onUnregisterTeam,
    })
    await user.click(screen.getByRole('button', { name: 'Cancelar registro' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar registro' , hidden: false }))

    // The ConfirmDialog button in the dialog
    const allButtons = screen.getAllByRole('button', { name: 'Cancelar registro' })
    await user.click(allButtons[allButtons.length - 1])
    expect(onUnregisterTeam).toHaveBeenCalledWith('team-1')
  })
})
