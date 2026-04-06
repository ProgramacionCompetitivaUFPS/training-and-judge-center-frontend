import { z } from 'zod'

export const createContestSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre no puede exceder 200 caracteres'),
  description: z
    .string()
    .max(5000, 'La descripción no puede exceder 5000 caracteres')
    .optional()
    .or(z.literal('')),
  startTime: z.string().min(1, 'La fecha de inicio es requerida'),
  endTime: z.string().min(1, 'La fecha de fin es requerida'),
  penalty: z.coerce
    .number()
    .int()
    .min(0, 'La penalización mínima es 0')
    .max(1440, 'La penalización máxima es 1440 minutos')
    .optional(),
  freezeMinutes: z.coerce
    .number()
    .int()
    .min(0, 'Los minutos de freeze deben ser positivos')
    .nullable()
    .optional(),
  enablePostContest: z.boolean().optional(),
  problems: z.array(z.string()).optional(),
})

export type CreateContestFormData = z.infer<typeof createContestSchema>

export const updateContestSchema = createContestSchema.partial()

export type UpdateContestFormData = z.infer<typeof updateContestSchema>
