import { z } from 'zod'

const tagRegex = /^[a-z0-9]([a-z0-9_-]*[a-z0-9])?$/

const tagSchema = z
  .string()
  .min(2, 'El tag debe tener al menos 2 caracteres')
  .max(50, 'El tag debe tener máximo 50 caracteres')
  .regex(tagRegex, 'Solo letras minúsculas, números, guiones y guiones bajos')
  .refine((t) => !t.includes('--') && !t.includes('__'), {
    message: 'No se permiten guiones o guiones bajos consecutivos',
  })

export const createMaterialSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(200, 'El título debe tener máximo 200 caracteres'),
  content: z
    .string()
    .max(50000, 'El contenido debe tener máximo 50000 caracteres')
    .optional()
    .default(''),
  tags: z.array(tagSchema).optional().default([]),
})

export const updateMaterialSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(200, 'El título debe tener máximo 200 caracteres')
    .optional(),
  content: z
    .string()
    .max(50000, 'El contenido debe tener máximo 50000 caracteres')
    .optional()
    .default(''),
  tags: z.array(tagSchema).optional().default([]),
})

export type CreateMaterialFormData = z.infer<typeof createMaterialSchema>
export type UpdateMaterialFormData = z.infer<typeof updateMaterialSchema>
