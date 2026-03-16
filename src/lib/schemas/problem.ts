import { z } from 'zod'

const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

export const createProblemSchema = z.object({
  slug: z
    .string()
    .min(3, 'El slug debe tener al menos 3 caracteres')
    .max(70, 'El slug no puede exceder 70 caracteres')
    .regex(slugRegex, 'Solo letras minúsculas, números y guiones. No puede iniciar/terminar con guión.')
    .refine((val) => !val.includes('--'), 'No puede contener guiones consecutivos'),
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(200, 'El título no puede exceder 200 caracteres'),
  statement: z
    .string()
    .max(50000, 'El enunciado no puede exceder 50000 caracteres')
    .optional()
    .or(z.literal('')),
  timeLimit: z
    .number({ invalid_type_error: 'Debe ser un número' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 ms')
    .max(300000, 'Máximo 300000 ms')
    .optional()
    .or(z.literal(undefined)),
  memoryLimit: z
    .number({ invalid_type_error: 'Debe ser un número' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 MiB')
    .max(2048, 'Máximo 2048 MiB')
    .optional()
    .or(z.literal(undefined)),
  tags: z
    .string()
    .optional(),
})

export type CreateProblemFormData = z.infer<typeof createProblemSchema>

export const updateProblemSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(200, 'El título no puede exceder 200 caracteres'),
  statement: z
    .string()
    .max(50000, 'El enunciado no puede exceder 50000 caracteres')
    .optional()
    .or(z.literal('')),
  timeLimit: z
    .number({ invalid_type_error: 'Debe ser un número' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 ms')
    .max(300000, 'Máximo 300000 ms')
    .optional()
    .or(z.literal(undefined)),
  memoryLimit: z
    .number({ invalid_type_error: 'Debe ser un número' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 MiB')
    .max(2048, 'Máximo 2048 MiB')
    .optional()
    .or(z.literal(undefined)),
  tags: z
    .string()
    .optional(),
  accessibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
})

export type UpdateProblemFormData = z.infer<typeof updateProblemSchema>

export const deleteProblemSchema = z.object({
  confirmSlug: z
    .string()
    .min(1, 'Escribe el slug del problema para confirmar'),
})

export type DeleteProblemFormData = z.infer<typeof deleteProblemSchema>
