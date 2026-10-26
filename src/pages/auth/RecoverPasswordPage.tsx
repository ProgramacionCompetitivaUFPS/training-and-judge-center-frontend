import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useRecoverPassword, useResetPassword } from '@/hooks/api/useUsers'
import { useToastContext } from '@/hooks/useToastContext'
import {
  recoverPasswordSchema,
  resetPasswordSchema,
  type RecoverPasswordFormData,
  type ResetPasswordFormData,
} from '@/lib/schemas/user'
import { ROUTES } from '@/lib/constants'
import { ApiClientError } from '@/lib/errors'
import { getErrorMessage } from '@/lib/errorMessages'

export function RecoverPasswordPage() {
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')

  if (step === 'reset') {
    return <ResetStep email={email} onChangeEmail={() => setStep('request')} />
  }

  return (
    <RequestStep
      defaultEmail={email}
      onSuccess={(submittedEmail) => {
        setEmail(submittedEmail)
        setStep('reset')
      }}
    />
  )
}

interface RequestStepProps { defaultEmail: string; onSuccess: (email: string) => void }

function RequestStep({ defaultEmail, onSuccess }: RequestStepProps) {
  const recoverMutation = useRecoverPassword()
  const { toast } = useToastContext()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoverPasswordFormData>({
    resolver: zodResolver(recoverPasswordSchema),
    defaultValues: { email: defaultEmail },
  })

  const onSubmit = async (data: RecoverPasswordFormData) => {
    try {
      await recoverMutation.mutateAsync(data)
      onSuccess(data.email)
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast({ variant: 'error', title: 'Error al enviar el código', description: getErrorMessage(error) })
      } else {
        toast({ variant: 'error', title: 'Error de conexión', description: 'Intenta de nuevo.' })
      }
    }
  }

  return (
    <AuthLayout title="Recuperar Contraseña" subtitle="Te enviaremos un código de verificación a tu correo">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

interface ResetStepProps { email: string; onChangeEmail: () => void }

const RESEND_COOLDOWN_SECONDS = 30

function ResetStep({ email, onChangeEmail }: ResetStepProps) {
  const resetMutation = useResetPassword()
  const resendMutation = useRecoverPassword()
  const navigate = useNavigate()
  const { toast } = useToastContext()
  // Seconds until "Reenviar código" is available again; starts counting from the first send.
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SECONDS)
  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  const handleResend = async () => {
    try {
      await resendMutation.mutateAsync({ email })
      toast({ variant: 'success', title: 'Código reenviado', description: `Revisa tu correo ${email}.` })
      setResendIn(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      toast({ variant: 'error', title: 'No se pudo reenviar el código', description: getErrorMessage(error, 'Intenta de nuevo.') })
    }
  }

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email, code: '', newPassword: '', confirmPassword: '' },
  })

  const newPasswordValue = useWatch({ control, name: 'newPassword' })

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await resetMutation.mutateAsync({
        email: data.email,
        code: data.code,
        newPassword: data.newPassword,
      })
      toast({
        variant: 'success',
        title: 'Contraseña restablecida',
        description: 'Ya puedes iniciar sesión con tu nueva contraseña.',
      })
      navigate(ROUTES.LOGIN)
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast({ variant: 'error', title: 'Error al restablecer la contraseña', description: getErrorMessage(error) })
      } else {
        toast({ variant: 'error', title: 'Error de conexión', description: 'Intenta de nuevo.' })
      }
    }
  }

  return (
    <AuthLayout title="Restablecer Contraseña" subtitle={`Ingresa el código enviado a ${email}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="code" className="text-sm font-medium text-neutral-text-primary">
            Código de verificación
          </label>
          <Input id="code" placeholder="Ingresa el código" {...register('code')} />
          {errors.code && <p className="text-sm text-status-error">{errors.code.message}</p>}
        </div>

        <PasswordInput
          id="newPassword"
          label="Nueva contraseña"
          placeholder="••••••••"
          showStrength
          strengthValue={newPasswordValue}
          helperText="Mínimo 8 caracteres, con mayúscula, número y carácter especial."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirmar contraseña"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Restableciendo...' : 'Restablecer Contraseña'}
        </Button>

        <div className="flex flex-col items-center gap-2 text-sm text-neutral-text-muted">
          <p>
            ¿No te llegó el código?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendIn > 0 || resendMutation.isPending}
              className="text-brand-primary hover:underline disabled:text-neutral-text-muted disabled:no-underline disabled:cursor-not-allowed"
            >
              {resendMutation.isPending ? 'Reenviando...' : resendIn > 0 ? `Reenviar código (${resendIn} s)` : 'Reenviar código'}
            </button>
          </p>
          <p>
            <button type="button" onClick={onChangeEmail} className="text-brand-primary hover:underline">
              Usar otro correo
            </button>
            {' · '}
            <Link to={ROUTES.LOGIN} className="text-brand-primary hover:underline">
              Volver a Iniciar Sesión
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
