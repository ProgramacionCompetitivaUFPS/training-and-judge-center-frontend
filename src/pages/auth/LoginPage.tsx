import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Checkbox } from '@/components/ui/Checkbox'
import { GoogleSignInButton } from '@/components/features/GoogleSignInButton'
import { useLogin, useGoogleLogin } from '@/hooks/api/useUsers'
import { useToastContext } from '@/hooks/useToastContext'
import { loginSchema, type LoginFormData } from '@/lib/schemas/user'
import { ROUTES } from '@/lib/constants'
import { ApiClientError } from '@/lib/errors'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const loginMutation = useLogin()
  const googleLoginMutation = useGoogleLogin()
  const { toast } = useToastContext()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || ROUTES.DASHBOARD

  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberSession: false },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync(data)
      navigate(from, { replace: true })
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast({
          variant: 'error',
          title: error.status === 401 ? 'Credenciales incorrectas' : 'Error al iniciar sesión',
          description: error.status === 401 ? undefined : error.message,
        })
      } else {
        toast({ variant: 'error', title: 'Error de conexión', description: 'Intenta de nuevo.' })
      }
    }
  }

  const handleGoogleCredential = async (idToken: string) => {
    try {
      await googleLoginMutation.mutateAsync({ id_token: idToken, rememberSession: getValues('rememberSession') })
      navigate(from, { replace: true })
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.code === 'GOOGLE_ACCOUNT_LINK_REQUIRED') {
          toast({
            variant: 'error',
            title: 'Ya existe una cuenta con este correo',
            description: 'Iniciá sesión con tu contraseña y vinculá Google desde tu perfil.',
          })
        } else {
          toast({
            variant: 'error',
            title: 'Error al iniciar sesión con Google',
            description: error.message,
          })
        }
      } else {
        toast({ variant: 'error', title: 'Error de conexión', description: 'Intenta de nuevo.' })
      }
    }
  }

  return (
    <AuthLayout title="Iniciar Sesión" subtitle="Ingresa tus credenciales para continuar">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-border" />
          <span className="text-xs text-neutral-text-muted">o</span>
          <div className="h-px flex-1 bg-neutral-border" />
        </div>

        <GoogleSignInButton onCredential={handleGoogleCredential} text="continue_with" />

        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="rememberSession"
            render={({ field }) => (
              <Checkbox
                id="rememberSession"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <label htmlFor="rememberSession" className="text-sm text-neutral-text-primary">
            Mantener sesión iniciada por 30 días
          </label>
        </div>

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
