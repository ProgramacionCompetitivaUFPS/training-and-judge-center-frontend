import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { stubEndpoint } from '@/test/hookHarness'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import type { User } from '@/types/user'
import { EditProfilePage } from './EditProfilePage'

const toastSpy = vi.fn()

vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: toastSpy }),
}))

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

// Mutable so each test can pick the role / account type it needs
let _authUser: User = { ...mockCurrentUser }

const mockLogout = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: _authUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: () => true,
    logout: mockLogout,
  }),
}))

// Stands in for Google's own button: pressing it delivers an id_token like a completed sign-in would
vi.mock('@/components/features/GoogleSignInButton', () => ({
  GoogleSignInButton: ({ onCredential }: { onCredential: (idToken: string) => void }) => (
    <button type="button" onClick={() => onCredential('google-id-token')}>
      Google simulado
    </button>
  ),
}))

function renderPage() {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EditProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EditProfilePage', () => {
  beforeEach(() => {
    _authUser = { ...mockCurrentUser }
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('pre-fills profile form with current user data', () => {
    // Arrange + Assert — data comes from useAuth, not network
    renderPage()

    expect(screen.getByDisplayValue('Luis Admin')).toBeInTheDocument()
  })

  it('shows success toast after saving profile changes', async () => {
    // Arrange
    const user = userEvent.setup()
    renderPage()

    // Act — clear name field and type new value, then submit
    const nameInput = screen.getByDisplayValue('Luis Admin')
    await user.clear(nameInput)
    await user.type(nameInput, 'Luis Actualizado')
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    // Assert
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' }),
      )
    })
  })

  it('shows error toast when server fails on profile update', async () => {
    // Arrange
    server.use(
      http.put('http://localhost:8080/api/users', () =>
        HttpResponse.json({ error: 'SERVER_ERROR' }, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    // Act
    const nameInput = screen.getByDisplayValue('Luis Admin')
    await user.clear(nameInput)
    await user.type(nameInput, 'Nombre Nuevo')
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    // Assert
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error' }),
      )
    })
  })
})

// ---------------------------------------------------------------------------
// Contraseña, correo, Google y desactivación
// ---------------------------------------------------------------------------

const STRONG_PASSWORD = 'Nueva123!'

function setUser(overrides: Partial<User> = {}) {
  _authUser = { ...mockCurrentUser, role: 'CONTESTANT', ...overrides }
}

function renderWithLoginSentinel() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<EditProfilePage />} />
          <Route path="/login" element={<div>LOGIN_SENTINEL</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EditProfilePage — cambiar contraseña', () => {
  beforeEach(() => {
    setUser()
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
    mockLogout.mockClear()
  })
  afterEach(() => clearAccessToken())

  async function fillPasswordForm(user: ReturnType<typeof userEvent.setup>, current: string, next: string, confirm: string) {
    await user.type(screen.getAllByLabelText('Contraseña actual')[0], current)
    await user.type(screen.getByLabelText('Nueva contraseña'), next)
    await user.type(screen.getByLabelText('Confirmar'), confirm)
    await user.click(screen.getByRole('button', { name: 'Cambiar Contraseña' }))
  }

  it('cambia la contraseña, avisa y cierra la sesión', async () => {
    const calls = stubEndpoint('put', '/users/password')
    const user = userEvent.setup()
    renderPage()

    await fillPasswordForm(user, 'Vieja123!', STRONG_PASSWORD, STRONG_PASSWORD)

    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1))
    expect(calls[0].body).toEqual({ currentPassword: 'Vieja123!', newPassword: STRONG_PASSWORD })
    expect(toastSpy).toHaveBeenCalledWith({
      variant: 'success',
      title: 'Contraseña actualizada',
      description: 'Por seguridad, cerramos tu sesión. Inicia sesión de nuevo con tu nueva contraseña.',
    })
  })

  it('no envía nada y marca el error cuando la confirmación no coincide', async () => {
    const calls = stubEndpoint('put', '/users/password')
    const user = userEvent.setup()
    renderPage()

    await fillPasswordForm(user, 'Vieja123!', STRONG_PASSWORD, 'Otra123!')

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('muestra bajo el campo el error de validación que devuelve el servidor y no cierra la sesión', async () => {
    stubEndpoint('put', '/users/password', {
      status: 422,
      body: {
        error: 'VALIDATION_ERROR',
        message: 'inválido',
        details: [{ field: 'currentPassword', message: 'La contraseña actual es incorrecta' }],
      },
    })
    const user = userEvent.setup()
    renderPage()

    await fillPasswordForm(user, 'Equivocada1!', STRONG_PASSWORD, STRONG_PASSWORD)

    expect(await screen.findByText('La contraseña actual es incorrecta')).toBeInTheDocument()
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('avisa con un toast cuando falla por otra causa', async () => {
    stubEndpoint('put', '/users/password', { status: 500, body: { error: 'SERVER_ERROR', message: 'fallo' } })
    const user = userEvent.setup()
    renderPage()

    await fillPasswordForm(user, 'Vieja123!', STRONG_PASSWORD, STRONG_PASSWORD)

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al cambiar la contraseña' })),
    )
    expect(mockLogout).not.toHaveBeenCalled()
  })
})

describe('EditProfilePage — crear contraseña (cuenta solo de Google)', () => {
  beforeEach(() => {
    setUser({ hasPassword: false })
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
  })
  afterEach(() => clearAccessToken())

  async function submitSetPassword(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Nueva contraseña'), STRONG_PASSWORD)
    await user.type(screen.getByLabelText('Confirmar'), STRONG_PASSWORD)
    // The email section also has a "Crear Contraseña" button (it scrolls here); the form's one is the submit
    const submit = screen.getAllByRole('button', { name: 'Crear Contraseña' }).find((b) => b.getAttribute('type') === 'submit')
    await user.click(submit as HTMLElement)
  }

  it('ofrece crear la contraseña en vez de cambiarla', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Crear Contraseña' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Cambiar Contraseña' })).not.toBeInTheDocument()
  })

  it('crea la contraseña y avisa', async () => {
    const calls = stubEndpoint('post', '/users/password')
    const user = userEvent.setup()
    renderPage()

    await submitSetPassword(user)

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith({
        variant: 'success',
        title: 'Contraseña creada',
        description: 'Ya puedes iniciar sesión también con tu correo y contraseña.',
      }),
    )
    expect(calls[0].body).toEqual({ newPassword: STRONG_PASSWORD })
  })

  it('avisa cuando ya tenía una contraseña configurada', async () => {
    stubEndpoint('post', '/users/password', { status: 409, body: { error: 'PASSWORD_ALREADY_SET', message: 'ya' } })
    const user = userEvent.setup()
    renderPage()

    await submitSetPassword(user)

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'error', title: 'Ya tienes una contraseña configurada' }))
  })

  it('muestra bajo el campo el error de validación que devuelve el servidor', async () => {
    stubEndpoint('post', '/users/password', {
      status: 422,
      body: { error: 'VALIDATION_ERROR', message: 'inválido', details: [{ field: 'newPassword', message: 'Contraseña demasiado común' }] },
    })
    const user = userEvent.setup()
    renderPage()

    await submitSetPassword(user)

    expect(await screen.findByText('Contraseña demasiado común')).toBeInTheDocument()
  })

  it('avisa con un toast cuando falla por otra causa', async () => {
    stubEndpoint('post', '/users/password', { status: 500, body: { error: 'SERVER_ERROR', message: 'fallo' } })
    const user = userEvent.setup()
    renderPage()

    await submitSetPassword(user)

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al crear la contraseña' })),
    )
  })

  it('en la sección de correo pide crear antes una contraseña', () => {
    renderPage()

    expect(screen.getByText(/primero crea una contraseña/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nuevo correo')).not.toBeInTheDocument()
  })
})

describe('EditProfilePage — cambiar correo', () => {
  beforeEach(() => {
    setUser()
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
  })
  afterEach(() => clearAccessToken())

  async function requestChange(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Nuevo correo'), 'nuevo@correo.com')
    await user.type(screen.getAllByLabelText('Contraseña actual')[1], 'Vieja123!')
    await user.click(screen.getByRole('button', { name: 'Solicitar Cambio' }))
  }

  it('solicita el cambio, avisa y pasa al paso de confirmación', async () => {
    const calls = stubEndpoint('post', '/users/email-change/request')
    const user = userEvent.setup()
    renderPage()

    await requestChange(user)

    expect(await screen.findByLabelText('Código de verificación')).toBeInTheDocument()
    expect(calls[0].body).toEqual({ newEmail: 'nuevo@correo.com', password: 'Vieja123!' })
    expect(toastSpy).toHaveBeenCalledWith({
      variant: 'success',
      title: 'Código enviado',
      description: 'Se envió un código de confirmación a tu nuevo correo.',
    })
  })

  it('no envía la solicitud con un correo de formato inválido', async () => {
    const calls = stubEndpoint('post', '/users/email-change/request')
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Nuevo correo'), 'no-es-un-correo')
    await user.type(screen.getAllByLabelText('Contraseña actual')[1], 'Vieja123!')
    await user.click(screen.getByRole('button', { name: 'Solicitar Cambio' }))

    expect(calls).toHaveLength(0)
    expect(screen.getByLabelText('Nuevo correo')).toBeInTheDocument()
  })

  it('muestra bajo el campo el error de validación que devuelve el servidor', async () => {
    stubEndpoint('post', '/users/email-change/request', {
      status: 422,
      body: { error: 'VALIDATION_ERROR', message: 'inválido', details: [{ field: 'newEmail', message: 'Ese correo ya está en uso' }] },
    })
    const user = userEvent.setup()
    renderPage()

    await requestChange(user)

    expect(await screen.findByText('Ese correo ya está en uso')).toBeInTheDocument()
    expect(screen.queryByLabelText('Código de verificación')).not.toBeInTheDocument()
  })

  it('avisa con un toast cuando solicitar el cambio falla por otra causa', async () => {
    stubEndpoint('post', '/users/email-change/request', { status: 500, body: { error: 'SERVER_ERROR', message: 'fallo' } })
    const user = userEvent.setup()
    renderPage()

    await requestChange(user)

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al solicitar cambio de email' })),
    )
  })

  describe('paso de confirmación', () => {
    async function reachConfirmStep(user: ReturnType<typeof userEvent.setup>) {
      stubEndpoint('post', '/users/email-change/request')
      await requestChange(user)
      await screen.findByLabelText('Código de verificación')
    }

    it('confirma el código, avisa y vuelve al formulario inicial', async () => {
      const user = userEvent.setup()
      renderPage()
      await reachConfirmStep(user)
      const calls = stubEndpoint('post', '/users/email-change/confirm')

      await user.type(screen.getByLabelText('Código de verificación'), '123456')
      await user.click(screen.getByRole('button', { name: 'Confirmar Cambio' }))

      await waitFor(() =>
        expect(toastSpy).toHaveBeenCalledWith({
          variant: 'success',
          title: 'Correo actualizado',
          description: 'Tu correo electrónico se cambió correctamente.',
        }),
      )
      expect(calls[0].body).toEqual({ code: '123456' })
      expect(await screen.findByLabelText('Nuevo correo')).toBeInTheDocument()
    })

    it('exige el código antes de enviar', async () => {
      const user = userEvent.setup()
      renderPage()
      await reachConfirmStep(user)

      await user.click(screen.getByRole('button', { name: 'Confirmar Cambio' }))

      expect(await screen.findByText('El código de verificación es requerido')).toBeInTheDocument()
    })

    it('avisa cuando el código es inválido o expiró', async () => {
      const user = userEvent.setup()
      renderPage()
      await reachConfirmStep(user)
      stubEndpoint('post', '/users/email-change/confirm', { status: 400, body: { error: 'INVALID_CODE', message: 'código vencido' } })

      await user.type(screen.getByLabelText('Código de verificación'), '000000')
      await user.click(screen.getByRole('button', { name: 'Confirmar Cambio' }))

      await waitFor(() =>
        expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Código inválido o expirado' })),
      )
      expect(screen.getByLabelText('Código de verificación')).toBeInTheDocument()
    })

    it('Cancelar vuelve a pedir el nuevo correo', async () => {
      const user = userEvent.setup()
      renderPage()
      await reachConfirmStep(user)

      await user.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(await screen.findByLabelText('Nuevo correo')).toBeInTheDocument()
    })
  })
})

describe('EditProfilePage — cuenta de Google', () => {
  beforeEach(() => {
    setUser()
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
  })
  afterEach(() => clearAccessToken())

  describe('vincular', () => {
    it('vincula la cuenta con el token que entrega Google y avisa', async () => {
      const calls = stubEndpoint('post', '/users/google')
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByRole('button', { name: 'Google simulado' }))

      await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Cuenta de Google vinculada' }))
      expect(calls[0].body).toEqual({ id_token: 'google-id-token' })
    })

    it.each([
      ['OAUTH_IDENTITY_CONFLICT', 'Esa cuenta de Google ya está vinculada a otro usuario.'],
      ['OAUTH_IDENTITY_ALREADY_LINKED', 'Tu cuenta ya tiene Google vinculado.'],
      ['INVALID_GOOGLE_TOKEN', 'No se pudo validar el token de Google. Intenta de nuevo.'],
      ['GOOGLE_EMAIL_NOT_VERIFIED', 'El correo de tu cuenta de Google no está verificado.'],
    ])('explica el error %s', async (code, description) => {
      stubEndpoint('post', '/users/google', { status: 409, body: { error: code, message: 'x' } })
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByRole('button', { name: 'Google simulado' }))

      await waitFor(() =>
        expect(toastSpy).toHaveBeenCalledWith({ variant: 'error', title: 'Error al vincular Google', description }),
      )
    })

    it('usa el mensaje del servidor cuando el código de error no es conocido', async () => {
      stubEndpoint('post', '/users/google', { status: 400, body: { error: 'OTHER', message: 'Mensaje del servidor' } })
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByRole('button', { name: 'Google simulado' }))

      await waitFor(() =>
        expect(toastSpy).toHaveBeenCalledWith({
          variant: 'error',
          title: 'Error al vincular Google',
          description: 'Mensaje del servidor',
        }),
      )
    })
  })

  describe('desvincular', () => {
    beforeEach(() => setUser({ googleLinked: true }))

    it('desvincula la cuenta y avisa', async () => {
      const calls = stubEndpoint('delete', '/users/google')
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByRole('button', { name: 'Desvincular cuenta de Google' }))

      await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Cuenta de Google desvinculada' }))
      expect(calls).toHaveLength(1)
    })

    it('avisa cuando no había una cuenta vinculada', async () => {
      stubEndpoint('delete', '/users/google', { status: 404, body: { error: 'OAUTH_IDENTITY_NOT_FOUND', message: 'x' } })
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByRole('button', { name: 'Desvincular cuenta de Google' }))

      await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'error', title: 'No tenías una cuenta de Google vinculada' }))
    })

    it('pide configurar una contraseña cuando Google es la única credencial', async () => {
      stubEndpoint('delete', '/users/google', { status: 409, body: { error: 'CANNOT_UNLINK_LAST_CREDENTIAL', message: 'x' } })
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByRole('button', { name: 'Desvincular cuenta de Google' }))

      await waitFor(() =>
        expect(toastSpy).toHaveBeenCalledWith({
          variant: 'error',
          title: 'Necesitas configurar una contraseña antes de desvincular tu cuenta de Google',
          description: 'Es tu única forma de iniciar sesión por ahora.',
        }),
      )
    })

    it('avisa con un toast genérico cuando falla por otra causa', async () => {
      stubEndpoint('delete', '/users/google', { status: 500, body: { error: 'SERVER_ERROR', message: 'fallo' } })
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByRole('button', { name: 'Desvincular cuenta de Google' }))

      await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'error', title: 'Error al desvincular Google' }))
    })

    it('sin contraseña no desvincula: lleva a crearla', async () => {
      setUser({ googleLinked: true, hasPassword: false })
      const calls = stubEndpoint('delete', '/users/google')
      const user = userEvent.setup()
      renderPage()

      expect(screen.getByText(/Crea una contraseña antes de desvincularla/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Desvincular cuenta de Google' }))

      expect(calls).toHaveLength(0)
    })
  })
})

describe('EditProfilePage — desactivar la cuenta', () => {
  beforeEach(() => {
    setUser()
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
    stubEndpoint('get', '/users/me/sole-lead-groups', { body: { groups: [] } })
  })
  afterEach(() => clearAccessToken())

  it('a un administrador le explica que no puede desactivar su cuenta y no ofrece el botón', () => {
    setUser({ role: 'ADMIN' })
    renderPage()

    expect(screen.getByText(/Como Administrador no puedes desactivar tu propia cuenta/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Desactivar mi cuenta' })).not.toBeInTheDocument()
  })

  it('pide la contraseña, envía el código y completa la desactivación volviendo al login', async () => {
    const requested = stubEndpoint('post', '/users/deactivation')
    const confirmed = stubEndpoint('post', '/users/deactivation/confirm')
    const user = userEvent.setup()
    renderWithLoginSentinel()

    await user.click(screen.getByRole('button', { name: 'Desactivar mi cuenta' }))
    await user.type(screen.getByLabelText('Confirma tu contraseña'), 'Vieja123!')
    await user.click(screen.getByRole('button', { name: 'Confirmar Desactivación' }))
    await user.type(await screen.findByLabelText('Código de confirmación'), '987654')
    await user.click(screen.getByRole('button', { name: 'Confirmar Desactivación' }))

    expect(await screen.findByText('LOGIN_SENTINEL')).toBeInTheDocument()
    expect(requested[0].body).toEqual({ password: 'Vieja123!' })
    expect(confirmed[0].body).toEqual({ code: '987654' })
    expect(toastSpy).toHaveBeenCalledWith({
      variant: 'success',
      title: 'Cuenta desactivada',
      description: 'Tu cuenta fue desactivada correctamente.',
    })
  })

  it('mantiene deshabilitado Confirmar Desactivación mientras no hay contraseña', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Desactivar mi cuenta' }))

    expect(screen.getByRole('button', { name: 'Confirmar Desactivación' })).toBeDisabled()
  })

  it('Cancelar vuelve al botón inicial y descarta la contraseña escrita', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Desactivar mi cuenta' }))
    await user.type(screen.getByLabelText('Confirma tu contraseña'), 'algo')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Desactivar mi cuenta' }))

    expect(screen.getByLabelText('Confirma tu contraseña')).toHaveValue('')
  })

  it('avisa de contraseña incorrecta cuando el servidor señala el campo password', async () => {
    stubEndpoint('post', '/users/deactivation', {
      status: 422,
      body: { error: 'VALIDATION_ERROR', message: 'x', details: [{ field: 'password', message: 'incorrecta' }] },
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Desactivar mi cuenta' }))
    await user.type(screen.getByLabelText('Confirma tu contraseña'), 'Equivocada1!')
    await user.click(screen.getByRole('button', { name: 'Confirmar Desactivación' }))

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith({
        variant: 'error',
        title: 'Contraseña incorrecta',
        description: 'La contraseña que escribiste no es la de tu cuenta.',
      }),
    )
  })

  it('avisa con un toast genérico cuando solicitar la desactivación falla por otra causa', async () => {
    stubEndpoint('post', '/users/deactivation', { status: 500, body: { error: 'SERVER_ERROR', message: 'fallo' } })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Desactivar mi cuenta' }))
    await user.type(screen.getByLabelText('Confirma tu contraseña'), 'Vieja123!')
    await user.click(screen.getByRole('button', { name: 'Confirmar Desactivación' }))

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al solicitar desactivación' })),
    )
  })

  it('avisa cuando el código de confirmación es inválido o expiró y permanece en el formulario', async () => {
    stubEndpoint('post', '/users/deactivation')
    stubEndpoint('post', '/users/deactivation/confirm', { status: 400, body: { error: 'INVALID_CODE', message: 'vencido' } })
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Desactivar mi cuenta' }))
    await user.type(screen.getByLabelText('Confirma tu contraseña'), 'Vieja123!')
    await user.click(screen.getByRole('button', { name: 'Confirmar Desactivación' }))

    await user.type(await screen.findByLabelText('Código de confirmación'), '000000')
    await user.click(screen.getByRole('button', { name: 'Confirmar Desactivación' }))

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Código inválido o expirado' })),
    )
    expect(screen.getByLabelText('Código de confirmación')).toBeInTheDocument()
  })

  it('exige el código antes de confirmar la desactivación', async () => {
    stubEndpoint('post', '/users/deactivation')
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Desactivar mi cuenta' }))
    await user.type(screen.getByLabelText('Confirma tu contraseña'), 'Vieja123!')
    await user.click(screen.getByRole('button', { name: 'Confirmar Desactivación' }))
    await screen.findByLabelText('Código de confirmación')

    await user.click(screen.getByRole('button', { name: 'Confirmar Desactivación' }))

    expect(await screen.findByText('El código de confirmación es requerido')).toBeInTheDocument()
  })

  it('una cuenta solo de Google no pide contraseña para solicitar el código', async () => {
    setUser({ hasPassword: false })
    const requested = stubEndpoint('post', '/users/deactivation')
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Desactivar mi cuenta' }))
    expect(screen.queryByLabelText('Confirma tu contraseña')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar Desactivación' }))

    await waitFor(() => expect(requested).toHaveLength(1))
  })

  it('advierte de los grupos que quedarían sin líder', async () => {
    stubEndpoint('get', '/users/me/sole-lead-groups', { body: { groups: [{ id: 'g1', name: 'ICPC Colombia' }, { id: 'g2', name: 'Principiantes CP' }] } })
    renderPage()

    expect(
      await screen.findByText(/Eres el único líder de «ICPC Colombia», «Principiantes CP»\. Si desactivas tu cuenta, esos grupos quedarán sin líder/),
    ).toBeInTheDocument()
  })

  it('avisa de que no se pudo comprobar si es único líder cuando la consulta falla', async () => {
    stubEndpoint('get', '/users/me/sole-lead-groups', { status: 500, body: { error: 'SERVER_ERROR', message: 'fallo' } })
    renderPage()

    expect(await screen.findByText(/No se pudo comprobar si eres el único líder de algún grupo/)).toBeInTheDocument()
  })
})
