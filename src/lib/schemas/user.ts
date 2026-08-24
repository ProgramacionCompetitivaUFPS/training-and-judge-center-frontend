import { z } from 'zod'
import { PASSWORD_SPECIAL_CHARS_REGEX } from '@/lib/password'

const passwordField = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede exceder 72 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
  .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
  .regex(PASSWORD_SPECIAL_CHARS_REGEX, 'La contraseña debe contener al menos un carácter especial')

const emailField = z
  .string()
  .min(1, 'El correo es requerido')
  .email('Correo electrónico inválido')

// confirmKey debe ser el nombre exacto de un campo del schema donde se usa
// (TypeScript no lo valida — un typo aquí solo se detecta probando el formulario)
function passwordsMatch(confirmKey: string) {
  return { message: 'Las contraseñas no coinciden', path: [confirmKey] }
}

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(1, 'La contraseña es requerida'),
  rememberSession: z.boolean(),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
  confirmPassword: z
    .string()
    .min(1, 'Confirma tu contraseña'),
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  nickname: z
    .string()
    .min(3, 'El nickname debe tener al menos 3 caracteres')
    .max(30, 'El nickname no puede exceder 30 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Solo letras, números, guiones y guiones bajos'),
  country: z
    .string()
    .min(1, 'El país es requerido'),
  city: z
    .string()
    .min(1, 'La ciudad es requerida'),
  institution: z
    .string()
    .min(1, 'La institución es requerida')
    .max(200, 'La institución no puede exceder 200 caracteres'),
}).refine((data) => data.password === data.confirmPassword, passwordsMatch('confirmPassword'))

export type RegisterFormData = z.infer<typeof registerSchema>

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  nickname: z
    .string()
    .min(3, 'El nickname debe tener al menos 3 caracteres')
    .max(30, 'El nickname no puede exceder 30 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Solo letras, números, guiones y guiones bajos'),
  country: z
    .string()
    .min(1, 'El país es requerido'),
  city: z
    .string()
    .min(1, 'La ciudad es requerida'),
  institution: z
    .string()
    .min(1, 'La institución es requerida')
    .max(200, 'La institución no puede exceder 200 caracteres'),
})

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'La contraseña actual es requerida'),
  newPassword: passwordField,
  confirmNewPassword: z
    .string()
    .min(1, 'Confirma tu nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmNewPassword, passwordsMatch('confirmNewPassword'))

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

export const setPasswordSchema = z.object({
  newPassword: passwordField,
  confirmNewPassword: z
    .string()
    .min(1, 'Confirma tu contraseña'),
}).refine((data) => data.newPassword === data.confirmNewPassword, passwordsMatch('confirmNewPassword'))

export type SetPasswordFormData = z.infer<typeof setPasswordSchema>

export const changeEmailSchema = z.object({
  newEmail: z
    .string()
    .min(1, 'El nuevo correo es requerido')
    .email('Correo electrónico inválido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida para confirmar'),
})

export type ChangeEmailFormData = z.infer<typeof changeEmailSchema>

export const confirmEmailChangeSchema = z.object({
  code: z
    .string()
    .min(1, 'El código de verificación es requerido'),
})

export type ConfirmEmailChangeFormData = z.infer<typeof confirmEmailChangeSchema>

export const confirmDeactivationSchema = z.object({
  code: z
    .string()
    .min(1, 'El código de confirmación es requerido'),
})

export type ConfirmDeactivationFormData = z.infer<typeof confirmDeactivationSchema>

export const recoverPasswordSchema = z.object({
  email: emailField,
})

export type RecoverPasswordFormData = z.infer<typeof recoverPasswordSchema>

export const resetPasswordSchema = z.object({
  email: emailField,
  code: z
    .string()
    .min(1, 'El código de verificación es requerido'),
  newPassword: passwordField,
  confirmPassword: z
    .string()
    .min(1, 'Confirma tu contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, passwordsMatch('confirmPassword'))

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export const adminUpdateUserSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),
  role: z
    .enum(['ADMIN', 'COACH', 'CONTESTANT'], { message: 'Rol inválido' })
    .optional(),
  institution: z
    .string()
    .max(200, 'La institución no puede exceder 200 caracteres')
    .optional(),
})

export type AdminUpdateUserFormData = z.infer<typeof adminUpdateUserSchema>
