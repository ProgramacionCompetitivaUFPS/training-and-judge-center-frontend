import { z } from 'zod'

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  visibility: z.enum(['VISIBLE', 'NOT_VISIBLE'], {
    message: 'Selecciona la visibilidad',
  }),
  joinPolicy: z.enum(['INVITE', 'REQUEST', 'OPEN'], {
    message: 'Selecciona la política de ingreso',
  }),
}).refine(
  (data) => {
    if (data.visibility === 'NOT_VISIBLE' && data.joinPolicy !== 'INVITE') {
      return false
    }
    return true
  },
  {
    message: 'Los grupos no visibles solo permiten política de invitación',
    path: ['joinPolicy'],
  },
)

export type CreateGroupFormData = z.infer<typeof createGroupSchema>

export const updateGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  visibility: z.enum(['VISIBLE', 'NOT_VISIBLE']).optional(),
  joinPolicy: z.enum(['INVITE', 'REQUEST', 'OPEN']).optional(),
})

export type UpdateGroupFormData = z.infer<typeof updateGroupSchema>

export const deleteGroupSchema = z.object({
  confirmationName: z
    .string()
    .min(1, 'Escribe el nombre del grupo para confirmar'),
})

export type DeleteGroupFormData = z.infer<typeof deleteGroupSchema>
