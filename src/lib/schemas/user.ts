import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Correo electrónico inválido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Correo electrónico inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede exceder 72 caracteres'),
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
    .regex(/^[a-z0-9_-]+$/, 'Solo letras minúsculas, números, guiones y guiones bajos'),
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
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

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
    .regex(/^[a-z0-9_-]+$/, 'Solo letras minúsculas, números, guiones y guiones bajos'),
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
  newPassword: z
    .string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede exceder 72 caracteres'),
  confirmNewPassword: z
    .string()
    .min(1, 'Confirma tu nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmNewPassword'],
})

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

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

export const recoverPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Correo electrónico inválido'),
})

export type RecoverPasswordFormData = z.infer<typeof recoverPasswordSchema>

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Correo electrónico inválido'),
  code: z
    .string()
    .min(1, 'El código de verificación es requerido'),
  newPassword: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede exceder 72 caracteres'),
  confirmPassword: z
    .string()
    .min(1, 'Confirma tu contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

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
