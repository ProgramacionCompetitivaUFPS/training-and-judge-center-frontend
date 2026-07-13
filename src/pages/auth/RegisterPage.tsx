import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Alert } from '@/components/ui/Alert'
import { useRegister } from '@/hooks/api/useUsers'
import { registerSchema, type RegisterFormData } from '@/lib/schemas/user'
import { ROUTES } from '@/lib/constants'
import { ApiClientError } from '@/lib/errors'

export function RegisterPage() {
  const navigate = useNavigate()
  const registerMutation = useRegister()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
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
      nickname: '',
      country: '',
      city: '',
      institution: '',
    },
  })

  const passwordValue = useWatch({ control, name: 'password' })

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

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-neutral-text-primary">Nombre completo</label>
          <Input id="name" placeholder="Tu nombre completo" autoFocus {...register('name')} />
          {errors.name && <p className="text-xs text-status-error">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="nickname" className="text-sm font-medium text-neutral-text-primary">Nickname</label>
            <Input id="nickname" placeholder="tu_nick" {...register('nickname')} />
            {errors.nickname && <p className="text-xs text-status-error">{errors.nickname.message}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="institution" className="text-sm font-medium text-neutral-text-primary">Institución</label>
            <Input id="institution" placeholder="Universidad" {...register('institution')} />
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
          <PasswordInput
            id="password"
            label="Contraseña"
            placeholder="••••••••"
            showStrength
            strengthValue={passwordValue}
            helperText="Mínimo 8 caracteres, con mayúscula, número y carácter especial."
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordInput
            id="confirmPassword"
            label="Confirmar"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
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
