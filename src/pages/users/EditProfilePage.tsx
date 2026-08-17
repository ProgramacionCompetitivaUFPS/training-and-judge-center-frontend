import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User, Lock, Mail, AlertTriangle } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/hooks/useToastContext'
import {
  useUpdateProfile,
  useChangePassword,
  useRequestEmailChange,
  useConfirmEmailChange,
  useRequestDeactivation,
  useConfirmDeactivation,
} from '@/hooks/api/useUsers'
import {
  updateProfileSchema,
  changePasswordSchema,
  changeEmailSchema,
  confirmEmailChangeSchema,
  confirmDeactivationSchema,
  type UpdateProfileFormData,
  type ChangePasswordFormData,
  type ChangeEmailFormData,
  type ConfirmEmailChangeFormData,
  type ConfirmDeactivationFormData,
} from '@/lib/schemas/user'
import { ApiClientError } from '@/lib/errors'
import { ROUTES } from '@/lib/constants'

export function EditProfilePage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <AppLayout breadcrumbs={[{ label: 'Configuración' }]}>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-extrabold text-neutral-text-primary">Configuración</h1>
        <ProfileSection user={user} />
        <PasswordSection />
        <EmailSection />
        <DeactivateSection />
      </div>
    </AppLayout>
  )
}

interface ProfileSectionProps { user: { name: string; nickname: string; country: string; city: string; institution: string } }

function ProfileSection({ user }: ProfileSectionProps) {
  const updateMutation = useUpdateProfile()
  const { toast } = useToastContext()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name,
      nickname: user.nickname,
      country: user.country,
      city: user.city,
      institution: user.institution,
    },
  })

  const onSubmit = async (data: UpdateProfileFormData) => {
    try {
      await updateMutation.mutateAsync(data)
      toast({ variant: 'success', title: 'Perfil actualizado', description: 'Tus datos se guardaron correctamente.' })
    } catch (error) {
      if (error instanceof ApiClientError && error.details?.length) {
        error.details.forEach((d) => setError(d.field as keyof UpdateProfileFormData, { message: d.message }))
      } else {
        toast({ variant: 'error', title: 'Error al actualizar el perfil' })
      }
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-brand-primary-muted flex items-center justify-center text-brand-primary">
            <User className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-bold text-neutral-text-primary">Datos Personales</h2>
        </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-neutral-text-primary">Nombre</label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-status-error">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="nickname" className="text-sm font-medium text-neutral-text-primary">Nickname</label>
            <Input id="nickname" {...register('nickname')} />
            {errors.nickname && <p className="text-sm text-status-error">{errors.nickname.message}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="institution" className="text-sm font-medium text-neutral-text-primary">Institución</label>
          <Input id="institution" {...register('institution')} />
          {errors.institution && <p className="text-sm text-status-error">{errors.institution.message}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="country" className="text-sm font-medium text-neutral-text-primary">País</label>
            <Input id="country" {...register('country')} />
            {errors.country && <p className="text-sm text-status-error">{errors.country.message}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-medium text-neutral-text-primary">Ciudad</label>
            <Input id="city" {...register('city')} />
            {errors.city && <p className="text-sm text-status-error">{errors.city.message}</p>}
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </form>
      </CardContent>
    </Card>
  )
}

function PasswordSection() {
  const changeMutation = useChangePassword()
  const { toast } = useToastContext()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  })

  const newPasswordValue = useWatch({ control, name: 'newPassword' })

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      await changeMutation.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      toast({ variant: 'success', title: 'Contraseña actualizada', description: 'Tu contraseña se cambió correctamente.' })
      reset()
    } catch (error) {
      if (error instanceof ApiClientError && error.details?.length) {
        error.details.forEach((d) => setError(d.field as keyof ChangePasswordFormData, { message: d.message }))
      } else {
        toast({
          variant: 'error',
          title: 'Error al cambiar la contraseña',
          description: error instanceof ApiClientError ? error.message : undefined,
        })
      }
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-brand-primary-muted flex items-center justify-center text-brand-primary">
            <Lock className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-bold text-neutral-text-primary">Cambiar Contraseña</h2>
        </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <PasswordInput
          id="currentPassword"
          label="Contraseña actual"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PasswordInput
            id="newPassword"
            label="Nueva contraseña"
            showStrength
            strengthValue={newPasswordValue}
            helperText="Mínimo 8 caracteres, con mayúscula, número y carácter especial."
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <PasswordInput
            id="confirmNewPassword"
            label="Confirmar"
            error={errors.confirmNewPassword?.message}
            {...register('confirmNewPassword')}
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Cambiando...' : 'Cambiar Contraseña'}
        </Button>
      </form>
      </CardContent>
    </Card>
  )
}

function EmailSection() {
  const emailMutation = useRequestEmailChange()
  const confirmMutation = useConfirmEmailChange()
  const { toast } = useToastContext()
  const [step, setStep] = useState<'request' | 'confirm'>('request')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<ChangeEmailFormData>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: '', password: '' },
  })

  const {
    register: registerConfirm,
    handleSubmit: handleSubmitConfirm,
    formState: { errors: confirmErrors },
    reset: resetConfirm,
  } = useForm<ConfirmEmailChangeFormData>({
    resolver: zodResolver(confirmEmailChangeSchema),
    defaultValues: { code: '' },
  })

  const onSubmit = async (data: ChangeEmailFormData) => {
    try {
      await emailMutation.mutateAsync(data)
      toast({
        variant: 'success',
        title: 'Código enviado',
        description: 'Se envió un código de confirmación a tu nuevo correo.',
      })
      reset()
      setStep('confirm')
    } catch (error) {
      if (error instanceof ApiClientError && error.details?.length) {
        error.details.forEach((d) => setError(d.field as keyof ChangeEmailFormData, { message: d.message }))
      } else {
        toast({
          variant: 'error',
          title: 'Error al solicitar cambio de email',
          description: error instanceof ApiClientError ? error.message : undefined,
        })
      }
    }
  }

  const onSubmitConfirm = async (data: ConfirmEmailChangeFormData) => {
    try {
      await confirmMutation.mutateAsync(data)
      toast({ variant: 'success', title: 'Correo actualizado', description: 'Tu correo electrónico se cambió correctamente.' })
      resetConfirm()
      setStep('request')
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Código inválido o expirado',
        description: error instanceof ApiClientError ? error.message : undefined,
      })
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-brand-primary-muted flex items-center justify-center text-brand-primary">
            <Mail className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-bold text-neutral-text-primary">Cambiar Email</h2>
        </div>
      {step === 'request' ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="newEmail" className="text-sm font-medium text-neutral-text-primary">Nuevo correo</label>
            <Input id="newEmail" type="email" placeholder="nuevo@correo.com" {...register('newEmail')} />
            {errors.newEmail && <p className="text-sm text-status-error">{errors.newEmail.message}</p>}
          </div>
          <PasswordInput
            id="emailPassword"
            label="Contraseña actual"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Solicitar Cambio'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmitConfirm(onSubmitConfirm)} className="space-y-4">
          <p className="text-sm text-neutral-text-muted">
            Ingresa el código de verificación que enviamos a tu nuevo correo para completar el cambio.
          </p>
          <div className="space-y-2">
            <label htmlFor="emailConfirmCode" className="text-sm font-medium text-neutral-text-primary">Código de verificación</label>
            <Input id="emailConfirmCode" placeholder="Ingresa el código" {...registerConfirm('code')} />
            {confirmErrors.code && <p className="text-sm text-status-error">{confirmErrors.code.message}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep('request')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={confirmMutation.isPending}>
              {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar Cambio'}
            </Button>
          </div>
        </form>
      )}
      </CardContent>
    </Card>
  )
}

function DeactivateSection() {
  const navigate = useNavigate()
  const deactivateMutation = useRequestDeactivation()
  const confirmMutation = useConfirmDeactivation()
  const { toast } = useToastContext()
  const [stage, setStage] = useState<'idle' | 'password' | 'code'>('idle')
  const [password, setPassword] = useState('')

  const {
    register: registerConfirm,
    handleSubmit: handleSubmitConfirm,
    formState: { errors: confirmErrors },
  } = useForm<ConfirmDeactivationFormData>({
    resolver: zodResolver(confirmDeactivationSchema),
    defaultValues: { code: '' },
  })

  const handleDeactivate = async () => {
    try {
      await deactivateMutation.mutateAsync({ password })
      toast({
        variant: 'success',
        title: 'Código enviado',
        description: 'Se envió un código de confirmación a tu correo para desactivar la cuenta.',
      })
      setStage('code')
      setPassword('')
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Error al solicitar desactivación',
        description: error instanceof ApiClientError ? error.message : undefined,
      })
    }
  }

  const onConfirmDeactivation = async (data: ConfirmDeactivationFormData) => {
    try {
      await confirmMutation.mutateAsync(data)
      toast({ variant: 'success', title: 'Cuenta desactivada', description: 'Tu cuenta fue desactivada correctamente.' })
      navigate(ROUTES.LOGIN)
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Código inválido o expirado',
        description: error instanceof ApiClientError ? error.message : undefined,
      })
    }
  }

  return (
    <Card className="border-status-error/20">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-status-error/10 flex items-center justify-center text-status-error">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-bold text-status-error">Desactivar Cuenta</h2>
        </div>
      <p className="text-sm text-neutral-text-muted">
        Esta acción desactivará tu cuenta. No podrás iniciar sesión hasta que un administrador la reactive.
      </p>
      {stage === 'idle' && (
        <Button variant="outline" onClick={() => setStage('password')} className="text-status-error border-status-error/30">
          Desactivar mi cuenta
        </Button>
      )}
      {stage === 'password' && (
        <div className="space-y-3">
          <PasswordInput
            id="deactivatePassword"
            label="Confirma tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setStage('idle'); setPassword('') }}>
              Cancelar
            </Button>
            <Button
              onClick={handleDeactivate}
              disabled={!password || deactivateMutation.isPending}
              className="bg-status-error hover:bg-status-error/90"
            >
              {deactivateMutation.isPending ? 'Procesando...' : 'Confirmar Desactivación'}
            </Button>
          </div>
        </div>
      )}
      {stage === 'code' && (
        <form onSubmit={handleSubmitConfirm(onConfirmDeactivation)} className="space-y-3">
          <p className="text-sm text-neutral-text-muted">
            Ingresa el código de confirmación que enviamos a tu correo para completar la desactivación.
          </p>
          <div className="space-y-2">
            <label htmlFor="deactivateConfirmCode" className="text-sm font-medium text-neutral-text-primary">Código de confirmación</label>
            <Input id="deactivateConfirmCode" placeholder="Ingresa el código" {...registerConfirm('code')} />
            {confirmErrors.code && <p className="text-sm text-status-error">{confirmErrors.code.message}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStage('idle')}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={confirmMutation.isPending}
              className="bg-status-error hover:bg-status-error/90"
            >
              {confirmMutation.isPending ? 'Procesando...' : 'Confirmar Desactivación'}
            </Button>
          </div>
        </form>
      )}
      </CardContent>
    </Card>
  )
}
