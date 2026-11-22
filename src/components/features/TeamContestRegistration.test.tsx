import { describe, it, expect, vi, beforeAll } from 'vitest'
import type { ComponentProps } from 'react'
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

function renderComp(overrides?: Partial<ComponentProps<typeof TeamContestRegistration>>) {
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

describe('TeamContestRegistration — contenido del registro y de la alineación', () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = vi.fn()
  })

  const twoMembers = [
    { id: 'u-1', nickname: 'luisadmin', eligible: true },
    { id: 'u-2', nickname: 'mariacoach', eligible: true },
  ]
  const registration = {
    team: { id: 'team-1', name: 'Equipo Alpha' },
    selectedMembers: [
      { id: 'u-1', nickname: 'luisadmin' },
      { id: 'u-2', nickname: 'mariacoach' },
    ],
    registeredAt: '2026-01-01T00:00:00Z',
  } as TeamRegistration

  async function openAndPickTeam(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /Registrar equipo/ }))
    await user.click(screen.getByRole('combobox', { name: 'Equipo a registrar' }))
    await user.click(screen.getByRole('option', { name: /Equipo Alpha/ }))
  }

  describe('tarjeta de registro', () => {
    it('explica el modo de participación por equipos y el tamaño de equipo', () => {
      renderComp({ participationMode: 'TEAM', teamSizeMin: 2, teamSizeMax: 4 })

      expect(screen.getByText('Registro por equipo')).toBeInTheDocument()
      expect(screen.getByText(/participación por equipos/)).toBeInTheDocument()
      expect(screen.getByText(/Tamaño de equipo: 2–4 miembros/)).toBeInTheDocument()
    })

    it('en modo mixto lo dice', () => {
      renderComp({ participationMode: 'MIXED' })

      expect(screen.getByText(/participación mixta \(individual o equipo\)/)).toBeInTheDocument()
    })

    it('no se ofrece si la competencia es solo individual', () => {
      const container = renderComp({ participationMode: 'INDIVIDUAL' })

      expect(container.firstChild).toBeNull()
    })

    it('en la variante inline solo muestra el botón', () => {
      renderComp({ variant: 'inline' })

      expect(screen.getByRole('button', { name: /Registrar equipo/ })).toBeInTheDocument()
      expect(screen.queryByText('Registro por equipo')).not.toBeInTheDocument()
    })
  })

  describe('equipo ya registrado', () => {
    it('la variante inline muestra una insignia con el nombre del equipo y las acciones', () => {
      renderComp({ variant: 'inline', myRegistration: registration, isRegistered: true })

      expect(screen.getByText('Equipo registrado: Equipo Alpha')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Editar alineación' })).toBeInTheDocument()
      expect(screen.queryByText('Tu equipo está registrado')).not.toBeInTheDocument()
    })

    it('la tarjeta lista los miembros inscritos', () => {
      renderComp({ myRegistration: registration, isRegistered: true })

      expect(screen.getByText(/luisadmin, mariacoach/)).toBeInTheDocument()
    })

    it('Salir quita solo al usuario actual de la alineación tras confirmar', async () => {
      const user = userEvent.setup()
      const onUpdateTeamRegistration = vi.fn()
      renderComp({ myRegistration: registration, isRegistered: true, teamSizeMin: 1, onUpdateTeamRegistration })

      await user.click(screen.getByRole('button', { name: 'Salir de esta competencia' }))
      await user.click(screen.getByRole('button', { name: 'Salir' }))

      expect(onUpdateTeamRegistration).toHaveBeenCalledWith('team-1', ['u-2'])
    })

    it('no deja salir si el equipo quedaría por debajo del mínimo', () => {
      renderComp({ myRegistration: registration, isRegistered: true, teamSizeMin: 2 })

      const leave = screen.getByRole('button', { name: 'Salir de esta competencia' })
      expect(leave).toBeDisabled()
      expect(leave).toHaveAttribute('title', 'No puedes salir: el equipo quedaría por debajo del mínimo (2)')
    })

    it('Editar alineación abre el formulario con el equipo y los miembros actuales y guarda los cambios', async () => {
      const user = userEvent.setup()
      const onUpdateTeamRegistration = vi.fn()
      const onTeamSelect = vi.fn()
      renderComp({
        myRegistration: registration,
        isRegistered: true,
        eligibility: { teamAlreadyRegistered: true, members: twoMembers },
        onUpdateTeamRegistration,
        onTeamSelect,
      })

      await user.click(screen.getByRole('button', { name: 'Editar alineación' }))

      const dialog = screen.getByRole('dialog')
      expect(onTeamSelect).toHaveBeenCalledWith('team-1')
      expect(within(dialog).getByText(/Ajusta quién participa con "Equipo Alpha" \(1–5 miembros\)\./)).toBeInTheDocument()
      expect(within(dialog).getByText('2/5')).toBeInTheDocument()

      await user.click(within(dialog).getByRole('checkbox', { name: /mariacoach/ }))
      await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

      expect(onUpdateTeamRegistration).toHaveBeenCalledWith('team-1', ['u-1'])
    })
  })

  describe('diálogo de registro', () => {
    it('avisa cuando el usuario no tiene equipos', async () => {
      const user = userEvent.setup()
      renderComp({ teams: [] })

      await user.click(screen.getByRole('button', { name: /Registrar equipo/ }))

      expect(screen.getByText('No tienes equipos. Crea uno primero en la sección de Equipos.')).toBeInTheDocument()
    })

    it('mientras carga la elegibilidad muestra «Cargando miembros…»', async () => {
      const user = userEvent.setup()
      renderComp({ isLoadingEligibility: true })

      await openAndPickTeam(user)

      expect(screen.getByText('Cargando miembros…')).toBeInTheDocument()
    })

    it('si falla la verificación ofrece reintentar', async () => {
      const user = userEvent.setup()
      const onRetryEligibility = vi.fn()
      renderComp({ eligibilityFailed: true, onRetryEligibility })

      await openAndPickTeam(user)
      await user.click(screen.getByRole('button', { name: 'Reintentar' }))

      expect(screen.getByText('No se pudo verificar qué miembros pueden participar.')).toBeInTheDocument()
      expect(onRetryEligibility).toHaveBeenCalledTimes(1)
    })

    it('si el equipo ya está inscrito sin el usuario explica cómo sumarse y no lista miembros', async () => {
      const user = userEvent.setup()
      renderComp({ eligibility: { teamAlreadyRegistered: true, members: twoMembers } })

      await openAndPickTeam(user)

      expect(screen.getByText(/Este equipo ya está inscrito en esta competencia sin ti/)).toBeInTheDocument()
      expect(screen.queryByText('Miembros participantes')).not.toBeInTheDocument()
    })

    it('un miembro no elegible aparece deshabilitado con el motivo', async () => {
      const user = userEvent.setup()
      renderComp({
        eligibility: {
          teamAlreadyRegistered: false,
          members: [
            { id: 'u-1', nickname: 'luisadmin', eligible: true },
            { id: 'u-2', nickname: 'mariacoach', eligible: false, reason: 'MEMBER_IN_ANOTHER_TEAM' },
            { id: 'u-3', nickname: 'pedro', eligible: false },
          ],
        },
      })

      await openAndPickTeam(user)

      expect(screen.getByRole('checkbox', { name: /mariacoach/ })).toBeDisabled()
      expect(screen.getByText('Ya inscrito con otro equipo')).toBeInTheDocument()
      expect(screen.getByText('No puede participar')).toBeInTheDocument()
    })

    it('si no hay suficientes miembros elegibles lo advierte', async () => {
      const user = userEvent.setup()
      renderComp({
        teamSizeMin: 2,
        eligibility: {
          teamAlreadyRegistered: false,
          members: [
            { id: 'u-1', nickname: 'luisadmin', eligible: true },
            { id: 'u-2', nickname: 'mariacoach', eligible: false, reason: 'MEMBER_NOT_IN_GROUP' },
          ],
        },
      })

      await openAndPickTeam(user)

      expect(screen.getByText(/Solo 1 miembro puede participar y la competencia exige al menos 2\./)).toBeInTheDocument()
    })

    it('con una selección por debajo del mínimo pide más miembros y mantiene el botón deshabilitado', async () => {
      const user = userEvent.setup()
      renderComp({ teamSizeMin: 2, eligibility: { teamAlreadyRegistered: false, members: twoMembers } })

      await openAndPickTeam(user)
      await user.click(screen.getByRole('checkbox', { name: /luisadmin/ }))

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('1/5')).toBeInTheDocument()
      expect(within(dialog).getByText('Necesitas al menos 2 miembros')).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Registrar equipo' })).toBeDisabled()
    })

    it('al llegar al máximo deshabilita al resto de los miembros', async () => {
      const user = userEvent.setup()
      renderComp({ teamSizeMax: 1, eligibility: { teamAlreadyRegistered: false, members: twoMembers } })

      await openAndPickTeam(user)
      await user.click(screen.getByRole('checkbox', { name: /luisadmin/ }))

      expect(screen.getByRole('checkbox', { name: /mariacoach/ })).toBeDisabled()
      expect(screen.getByRole('checkbox', { name: /luisadmin/ })).toBeEnabled()
    })

    it('en edición pide quitar a un miembro que dejó de ser elegible', async () => {
      const user = userEvent.setup()
      renderComp({
        myRegistration: registration,
        isRegistered: true,
        eligibility: {
          teamAlreadyRegistered: true,
          members: [
            { id: 'u-1', nickname: 'luisadmin', eligible: true },
            { id: 'u-2', nickname: 'mariacoach', eligible: false, reason: 'MEMBER_NOT_IN_GROUP' },
          ],
        },
      })

      await user.click(screen.getByRole('button', { name: 'Editar alineación' }))

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Quita a los miembros que ya no pueden participar para continuar.')).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    })
  })
})
