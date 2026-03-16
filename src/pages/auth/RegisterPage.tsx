import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useRegister } from '@/hooks/api/useUsers'
import { registerSchema, type RegisterFormData } from '@/lib/schemas/user'
import { ROUTES } from '@/lib/constants'
import { ApiClientError } from '@/api/client'

export function RegisterPage() {
  const navigate = useNavigate()
  const registerMutation = useRegister()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
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

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null)
    try {
      const { confirmPassword: _, ...requestData } = data
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-neutral-text-primary">
              Nombre completo
            </label>
            <Input id="name" placeholder="Tu nombre" {...register('name')} />
            {errors.name && <p className="text-sm text-status-error">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="nickname" className="text-sm font-medium text-neutral-text-primary">
              Nickname
            </label>
            <Input id="nickname" placeholder="tu_nickname" {...register('nickname')} />
            {errors.nickname && <p className="text-sm text-status-error">{errors.nickname.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-neutral-text-primary">
            Correo electrónico
          </label>
          <Input id="email" type="email" placeholder="tu@correo.com" {...register('email')} />
          {errors.email && <p className="text-sm text-status-error">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-neutral-text-primary">
              Contraseña
            </label>
            <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="text-sm text-status-error">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-text-primary">
              Confirmar contraseña
            </label>
            <Input id="confirmPassword" type="password" placeholder="••••••••" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-sm text-status-error">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="institution" className="text-sm font-medium text-neutral-text-primary">
            Institución
          </label>
          <Input id="institution" placeholder="Tu universidad o institución" {...register('institution')} />
          {errors.institution && <p className="text-sm text-status-error">{errors.institution.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="country" className="text-sm font-medium text-neutral-text-primary">
              País
            </label>
            <Input id="country" placeholder="Tu país" {...register('country')} />
            {errors.country && <p className="text-sm text-status-error">{errors.country.message}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-medium text-neutral-text-primary">
              Ciudad
            </label>
            <Input id="city" placeholder="Tu ciudad" {...register('city')} />
            {errors.city && <p className="text-sm text-status-error">{errors.city.message}</p>}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Registrando...' : 'Crear Cuenta'}
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
