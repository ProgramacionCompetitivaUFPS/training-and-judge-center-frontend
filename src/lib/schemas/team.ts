import { z } from 'zod'

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre del equipo es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .refine((val) => val.trim().length > 0, 'El nombre no puede ser solo espacios en blanco'),
})

export type CreateTeamFormData = z.infer<typeof createTeamSchema>

export const inviteTeamMemberSchema = z.object({
  nickname: z
    .string()
    .min(1, 'El nickname es requerido'),
})

export type InviteTeamMemberFormData = z.infer<typeof inviteTeamMemberSchema>
