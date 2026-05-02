import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useRegister } from '@/hooks/api/useUsers'
import { registerSchema, type RegisterFormData } from '@/lib/schemas/user'
import { ROUTES } from '@/lib/constants'
import { ApiClientError } from '@/lib/errors'

function getPasswordStrength(password: string): { level: 1 | 2 | 3; label: string; color: string } | null {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  if (score <= 1) return { level: 1, label: 'Débil', color: 'bg-status-error' }
  if (score <= 3) return { level: 2, label: 'Media', color: 'bg-status-warning' }
  return { level: 3, label: 'Fuerte', color: 'bg-status-success' }
}

export function RegisterPage() {
  const navigate = useNavigate()
  const registerMutation = useRegister()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      lastname: '',
      nickname: '',
      country: '',
      city: '',
      institution: '',
    },
  })

  const passwordValue = watch('password')
  const strength = getPasswordStrength(passwordValue)

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null)
    try {
      const { confirmPassword: _confirmPassword, ...requestData } = data
      await registerMutation.mutateAsync(requestData)
      navigate(ROUTES.LOGIN, { state: { registered: true } })
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.details) {
          error.details.forEach((detail) => {
            setError(detail.field as keyof RegisterFormData, { message: detail.message })
          })
        } else {
          setServerError(error.message)
        }
      } else {
        setServerError('Error de conexión. Intenta de nuevo.')
      }
    }
  }

  return (
    <AuthLayout title="Crear Cuenta" subtitle="Regístrate como competidor">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && <Alert variant="error">{serverError}</Alert>}

        {/* Fila 1: Nombre | Apellido | Nickname */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-neutral-text-primary">Nombre</label>
            <Input id="name" placeholder="Tu nombre" autoFocus {...register('name')} />
            {errors.name && <p className="text-xs text-status-error">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="lastname" className="text-sm font-medium text-neutral-text-primary">Apellido</label>
            <Input id="lastname" placeholder="Tu apellido" {...register('lastname')} />
            {errors.lastname && <p className="text-xs text-status-error">{errors.lastname.message}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="nickname" className="text-sm font-medium text-neutral-text-primary">Nickname</label>
            <Input id="nickname" placeholder="tu_nick" {...register('nickname')} />
            {errors.nickname && <p className="text-xs text-status-error">{errors.nickname.message}</p>}
          </div>
        </div>

        {/* Fila 2: Institución | País | Ciudad */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <label htmlFor="institution" className="text-sm font-medium text-neutral-text-primary">Institución</label>
            <Input id="institution" placeholder="Universidad..." {...register('institution')} />
            {errors.institution && <p className="text-xs text-status-error">{errors.institution.message}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="country" className="text-sm font-medium text-neutral-text-primary">País</label>
            <Input id="country" placeholder="Tu país" {...register('country')} />
            {errors.country && <p className="text-xs text-status-error">{errors.country.message}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-medium text-neutral-text-primary">Ciudad</label>
            <Input id="city" placeholder="Tu ciudad" {...register('city')} />
            {errors.city && <p className="text-xs text-status-error">{errors.city.message}</p>}
          </div>
        </div>

        {/* Fila 3: Correo (ancho completo) */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-neutral-text-primary">Correo electrónico</label>
          <Input id="email" type="email" placeholder="tu@correo.com" {...register('email')} />
          {errors.email && <p className="text-xs text-status-error">{errors.email.message}</p>}
        </div>

        {/* Fila 4: Contraseña | Confirmar contraseña */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-neutral-text-primary">Contraseña</label>
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
            {strength && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map(n => (
                    <div key={n} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${n <= strength.level ? strength.color : 'bg-neutral-border'}`} />
                  ))}
                </div>
                <p className="text-xs text-neutral-text-muted">{strength.label}</p>
              </div>
            )}
            {errors.password && <p className="text-xs text-status-error">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-text-primary">Confirmar</label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pr-10"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-text-muted hover:text-neutral-text-primary transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-status-error">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
          Crear Cuenta
        </Button>

        <p className="text-center text-sm text-neutral-text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link to={ROUTES.LOGIN} className="text-brand-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
