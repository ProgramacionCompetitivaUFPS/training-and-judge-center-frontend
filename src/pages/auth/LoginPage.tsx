import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Alert } from '@/components/ui/Alert'
import { useLogin } from '@/hooks/api/useUsers'
import { loginSchema, type LoginFormData } from '@/lib/schemas/user'
import { ROUTES } from '@/lib/constants'
import { ApiClientError } from '@/lib/errors'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const loginMutation = useLogin()
  const [serverError, setServerError] = useState<string | null>(null)

  const registered = (location.state as { registered?: boolean })?.registered

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || ROUTES.DASHBOARD

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null)
    try {
      await loginMutation.mutateAsync(data)
      navigate(from, { replace: true })
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerError(
          error.status === 401
            ? 'Credenciales incorrectas'
            : error.message,
        )
      } else {
        setServerError('Error de conexión. Intenta de nuevo.')
      }
    }
  }

  return (
    <AuthLayout title="Iniciar Sesión" subtitle="Ingresa tus credenciales para continuar">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {registered && (
          <Alert variant="success">¡Cuenta creada! Ya puedes iniciar sesión.</Alert>
        )}
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-neutral-text-primary">
            Correo electrónico
          </label>
          <Input
            id="email"
            type="email"
            placeholder="tu@correo.com"
            autoFocus
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-status-error">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-neutral-text-primary">
              Contraseña
            </label>
            <Link
              to={ROUTES.RECOVER_PASSWORD}
              className="text-sm text-brand-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
          Iniciar Sesión
        </Button>

        <p className="text-center text-sm text-neutral-text-muted">
          ¿No tienes cuenta?{' '}
          <Link to={ROUTES.REGISTER} className="text-brand-primary hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
