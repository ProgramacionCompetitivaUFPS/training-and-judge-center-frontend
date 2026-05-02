import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
  const [showPassword, setShowPassword] = useState(false)

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
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-text-muted hover:text-neutral-text-primary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-status-error">{errors.password.message}</p>
          )}
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
