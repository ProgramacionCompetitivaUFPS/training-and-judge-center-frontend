import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User, Lock, Mail, AlertTriangle } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/hooks/useAuth'
import {
  useUpdateProfile,
  useChangePassword,
  useRequestEmailChange,
  useRequestDeactivation,
} from '@/hooks/api/useUsers'
import {
  updateProfileSchema,
  changePasswordSchema,
  changeEmailSchema,
  type UpdateProfileFormData,
  type ChangePasswordFormData,
  type ChangeEmailFormData,
} from '@/lib/schemas/user'
import { ApiClientError } from '@/lib/errors'

export function EditProfilePage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <AppLayout>
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
    setMessage(null)
    try {
      await updateMutation.mutateAsync(data)
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' })
    } catch (error) {
      if (error instanceof ApiClientError && error.details) {
        error.details.forEach((d) => setError(d.field as keyof UpdateProfileFormData, { message: d.message }))
      } else {
        setMessage({ type: 'error', text: 'Error al actualizar el perfil.' })
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
      {message && <Alert variant={message.type}>{message.text}</Alert>}
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  })

  const newPasswordValue = useWatch({ control, name: 'newPassword' })

  const onSubmit = async (data: ChangePasswordFormData) => {
    setMessage(null)
    try {
      await changeMutation.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      setMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' })
      reset()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof ApiClientError ? error.message : 'Error al cambiar la contraseña.',
      })
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
      {message && <Alert variant={message.type}>{message.text}</Alert>}
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangeEmailFormData>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: '', password: '' },
  })

  const onSubmit = async (data: ChangeEmailFormData) => {
    setMessage(null)
    try {
      await emailMutation.mutateAsync(data)
      setMessage({ type: 'success', text: 'Se envió un código de confirmación a tu nuevo correo.' })
      reset()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof ApiClientError ? error.message : 'Error al solicitar cambio de email.',
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
      {message && <Alert variant={message.type}>{message.text}</Alert>}
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
      </CardContent>
    </Card>
  )
}

function DeactivateSection() {
  const deactivateMutation = useRequestDeactivation()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [password, setPassword] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDeactivate = async () => {
    setMessage(null)
    try {
      await deactivateMutation.mutateAsync({ password })
      setMessage({ type: 'success', text: 'Se envió un código de confirmación a tu correo para desactivar la cuenta.' })
      setShowConfirm(false)
      setPassword('')
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof ApiClientError ? error.message : 'Error al solicitar desactivación.',
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
      {message && <Alert variant={message.type}>{message.text}</Alert>}
      {!showConfirm ? (
        <Button variant="outline" onClick={() => setShowConfirm(true)} className="text-status-error border-status-error/30">
          Desactivar mi cuenta
        </Button>
      ) : (
        <div className="space-y-3">
          <PasswordInput
            id="deactivatePassword"
            label="Confirma tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowConfirm(false); setPassword('') }}>
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
      </CardContent>
    </Card>
  )
}
