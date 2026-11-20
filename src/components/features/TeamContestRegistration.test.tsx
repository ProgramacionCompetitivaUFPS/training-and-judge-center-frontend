import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamContestRegistration } from './TeamContestRegistration'
import type { MyTeamItem, ContestTeamRegistrationsResponse, TeamRegistrationEligibility } from '@/types/team'
import type { ContestStatus } from '@/types/contest'

type TeamRegistration = ContestTeamRegistrationsResponse['teams'][number]

const mockTeam: MyTeamItem = {
  id: 'team-1',
  name: 'Equipo Alpha',
  memberCount: 3,
  joinedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
}

const baseProps = {
  contestId: 'contest-1',
  contestStatus: 'SCHEDULED' as ContestStatus,
  allowLateRegistration: false,
  participationMode: 'TEAM',
  isRegistered: false,
  teams: [mockTeam],
  isLoadingTeams: false,
  eligibility: undefined as TeamRegistrationEligibility | undefined,
  isLoadingEligibility: false,
  isFetchingEligibility: false,
  eligibilityFailed: false,
  onRetryEligibility: vi.fn(),
  myRegistration: undefined as TeamRegistration | undefined,
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
        { id: 'u-1', nickname: 'luisadmin' },
        { id: 'u-2', nickname: 'mariacoach' },
      ],
      registeredAt: '2026-01-01T00:00:00Z',
    } as TeamRegistration

    renderComp({ myRegistration, isRegistered: true })
    expect(screen.getByText('Tu equipo está registrado')).toBeInTheDocument()
    expect(screen.getByText(/Equipo Alpha/)).toBeInTheDocument()
  })

  it('abre el ConfirmDialog de cancelar registro al hacer click', async () => {
    const user = userEvent.setup()
    const myRegistration = {
      team: { id: 'team-1', name: 'Equipo Alpha' },
      selectedMembers: [
        { id: 'u-1', nickname: 'luisadmin' },
        { id: 'u-2', nickname: 'mariacoach' },
      ],
      registeredAt: '2026-01-01T00:00:00Z',
    } as TeamRegistration

    renderComp({ myRegistration, isRegistered: true })
    await user.click(screen.getByRole('button', { name: 'Cancelar registro' }))
    expect(screen.getByText('Cancelar registro del equipo')).toBeInTheDocument()
  })

  it('llama onUnregisterTeam al confirmar cancelación', async () => {
    const user = userEvent.setup()
    const onUnregisterTeam = vi.fn()
    const myRegistration = {
      team: { id: 'team-1', name: 'Equipo Alpha' },
      selectedMembers: [
        { id: 'u-1', nickname: 'luisadmin' },
        { id: 'u-2', nickname: 'mariacoach' },
      ],
      registeredAt: '2026-01-01T00:00:00Z',
    } as TeamRegistration

    renderComp({
      myRegistration,
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

describe('TeamContestRegistration — inscripción tardía', () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = vi.fn()
  })

  const eligibility = {
    teamAlreadyRegistered: false,
    members: [{ id: 'u-1', nickname: 'luisadmin', eligible: true }],
  }

  async function submitTeamSelection(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /Registrar equipo/ }))
    await user.click(screen.getByRole('combobox', { name: 'Equipo a registrar' }))
    await user.click(screen.getByRole('option', { name: /Equipo Alpha/ }))
    await user.click(screen.getByRole('checkbox', { name: /luisadmin/ }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Registrar equipo' }))
  }

  it.each<[ContestStatus, boolean, boolean]>([
    ['SCHEDULED', false, true],
    ['ACTIVE', true, true],
    ['ACTIVE', false, false],
    ['FINISHED', true, false],
    ['FINISHED', false, false],
  ])('con estado %s y allowLateRegistration=%s, el botón Registrar equipo visible=%s', (contestStatus, allowLateRegistration, visible) => {
    renderComp({ contestStatus, allowLateRegistration })

    if (visible) {
      expect(screen.getByRole('button', { name: /Registrar equipo/ })).toBeInTheDocument()
    } else {
      expect(screen.queryByRole('button', { name: /Registrar equipo/ })).not.toBeInTheDocument()
    }
  })

  it('no ofrece gestionar un registro existente una vez iniciada la competencia', () => {
    const myRegistration = {
      team: { id: 'team-1', name: 'Equipo Alpha' },
      selectedMembers: [{ id: 'u-1', nickname: 'luisadmin' }],
      registeredAt: '2026-01-01T00:00:00Z',
    } as TeamRegistration

    const container = renderComp({
      contestStatus: 'ACTIVE',
      allowLateRegistration: true,
      isRegistered: true,
      myRegistration,
    })

    expect(container.firstChild).toBeNull()
  })

  it('en ACTIVE pide confirmación y solo inscribe al confirmar', async () => {
    const user = userEvent.setup()
    const onRegisterTeam = vi.fn()
    renderComp({ contestStatus: 'ACTIVE', allowLateRegistration: true, eligibility, onRegisterTeam })

    await submitTeamSelection(user)

    expect(onRegisterTeam).not.toHaveBeenCalled()
    expect(screen.getByText('Inscripción tardía')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Inscribirme' }))

    expect(onRegisterTeam).toHaveBeenCalledWith('team-1', ['u-1'])
  })

  it('en ACTIVE no inscribe si se cancela el aviso', async () => {
    const user = userEvent.setup()
    const onRegisterTeam = vi.fn()
    renderComp({ contestStatus: 'ACTIVE', allowLateRegistration: true, eligibility, onRegisterTeam })

    await submitTeamSelection(user)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onRegisterTeam).not.toHaveBeenCalled()
  })

  it.each<[string, Partial<typeof baseProps>]>([
    ['hay una consulta de elegibilidad en curso', { isFetchingEligibility: true }],
    ['el miembro dejó de ser elegible', { eligibility: { teamAlreadyRegistered: false, members: [{ id: 'u-1', nickname: 'luisadmin', eligible: false }] } }],
  ])('en ACTIVE no inscribe al confirmar si %s y vuelve al selector', async (_caso, cambio) => {
    // Arrange
    const user = userEvent.setup()
    const onRegisterTeam = vi.fn()
    const props = { ...baseProps, contestStatus: 'ACTIVE' as ContestStatus, allowLateRegistration: true, eligibility, onRegisterTeam }
    const { rerender } = render(<TeamContestRegistration {...props} />)
    await submitTeamSelection(user)

    // Act: la elegibilidad cambia mientras el aviso está abierto
    rerender(<TeamContestRegistration {...props} {...cambio} />)
    await user.click(screen.getByRole('button', { name: 'Inscribirme' }))

    // Assert
    expect(onRegisterTeam).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'Equipo a registrar' })).toBeInTheDocument()
  })

  it('en SCHEDULED inscribe directo, sin aviso', async () => {
    const user = userEvent.setup()
    const onRegisterTeam = vi.fn()
    renderComp({ contestStatus: 'SCHEDULED', allowLateRegistration: false, eligibility, onRegisterTeam })

    await submitTeamSelection(user)

    expect(onRegisterTeam).toHaveBeenCalledWith('team-1', ['u-1'])
    expect(screen.queryByText('Inscripción tardía')).not.toBeInTheDocument()
  })
})
