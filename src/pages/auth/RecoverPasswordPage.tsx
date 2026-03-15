import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useRecoverPassword, useResetPassword } from '@/hooks/api/useUsers'
import {
  recoverPasswordSchema,
  resetPasswordSchema,
  type RecoverPasswordFormData,
  type ResetPasswordFormData,
} from '@/lib/schemas/user'
import { ROUTES } from '@/lib/constants'
import { ApiClientError } from '@/api/client'

export function RecoverPasswordPage() {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request')
  const [email, setEmail] = useState('')

  if (step === 'done') {
    return (
      <AuthLayout title="Contraseña Restablecida" subtitle="Tu contraseña ha sido actualizada correctamente">
        <div className="text-center space-y-4">
          <Alert variant="success">Ya puedes iniciar sesión con tu nueva contraseña.</Alert>
          <Link to={ROUTES.LOGIN}>
            <Button className="w-full">Ir a Iniciar Sesión</Button>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (step === 'reset') {
    return <ResetStep email={email} onSuccess={() => setStep('done')} />
  }

  return (
    <RequestStep
      onSuccess={(submittedEmail) => {
        setEmail(submittedEmail)
        setStep('reset')
      }}
    />
  )
}

function RequestStep({ onSuccess }: { onSuccess: (email: string) => void }) {
  const recoverMutation = useRecoverPassword()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoverPasswordFormData>({
    resolver: zodResolver(recoverPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: RecoverPasswordFormData) => {
    setServerError(null)
    try {
      await recoverMutation.mutateAsync(data)
      onSuccess(data.email)
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerError(error.message)
      } else {
        setServerError('Error de conexión. Intenta de nuevo.')
      }
    }
  }

  return (
    <AuthLayout title="Recuperar Contraseña" subtitle="Te enviaremos un código de verificación a tu correo">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-neutral-text-primary">
            Correo electrónico
          </label>
          <Input id="email" type="email" placeholder="tu@correo.com" {...register('email')} />
          {errors.email && <p className="text-sm text-status-error">{errors.email.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar Código'}
        </Button>

        <p className="text-center text-sm text-neutral-text-muted">
          <Link to={ROUTES.LOGIN} className="text-brand-primary hover:underline">
            Volver a Iniciar Sesión
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

function ResetStep({ email, onSuccess }: { email: string; onSuccess: () => void }) {
  const resetMutation = useResetPassword()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email, code: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerError(null)
    try {
      await resetMutation.mutateAsync({
        email: data.email,
        code: data.code,
        newPassword: data.newPassword,
      })
      onSuccess()
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerError(error.message)
      } else {
        setServerError('Error de conexión. Intenta de nuevo.')
      }
    }
  }

  return (
    <AuthLayout title="Restablecer Contraseña" subtitle={`Ingresa el código enviado a ${email}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <div className="space-y-2">
          <label htmlFor="code" className="text-sm font-medium text-neutral-text-primary">
            Código de verificación
          </label>
          <Input id="code" placeholder="Ingresa el código" {...register('code')} />
          {errors.code && <p className="text-sm text-status-error">{errors.code.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="newPassword" className="text-sm font-medium text-neutral-text-primary">
            Nueva contraseña
          </label>
          <Input id="newPassword" type="password" placeholder="••••••••" {...register('newPassword')} />
          {errors.newPassword && <p className="text-sm text-status-error">{errors.newPassword.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-text-primary">
            Confirmar contraseña
          </label>
          <Input id="confirmPassword" type="password" placeholder="••••••••" {...register('confirmPassword')} />
          {errors.confirmPassword && <p className="text-sm text-status-error">{errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Restableciendo...' : 'Restablecer Contraseña'}
        </Button>
      </form>
    </AuthLayout>
  )
}
