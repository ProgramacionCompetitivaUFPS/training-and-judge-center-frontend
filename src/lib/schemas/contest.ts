import { z } from 'zod'

const baseContestSchema = z.object({
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
  participationMode: z.enum(['INDIVIDUAL', 'TEAM', 'MIXED']).optional(),
  teamSizeMin: z.coerce.number().int().min(1, 'Mínimo 1 miembro').optional(),
  teamSizeMax: z.coerce.number().int().min(1, 'Mínimo 1 miembro').optional(),
  showTeamMembers: z.boolean().optional(),
})

function hasValidTeamSizes(data: { participationMode?: string; teamSizeMin?: number; teamSizeMax?: number }) {
  return data.participationMode === 'INDIVIDUAL' || !data.participationMode ||
    (data.teamSizeMin != null && data.teamSizeMax != null)
}

function teamSizeMaxAboveMin(data: { teamSizeMin?: number; teamSizeMax?: number }) {
  return data.teamSizeMin == null || data.teamSizeMax == null || data.teamSizeMax >= data.teamSizeMin
}

function durationMs(data: { startTime?: string; endTime?: string }): number | null {
  if (!data.startTime || !data.endTime) return null
  return new Date(data.endTime).getTime() - new Date(data.startTime).getTime()
}

// Mirror of the backend's domain checks (contest.go) so these surface on the field instead of
// as a rejected request.
function endAfterStart(data: { startTime?: string; endTime?: string }) {
  const ms = durationMs(data)
  return ms == null || ms > 0
}

function freezeShorterThanDuration(data: { startTime?: string; endTime?: string; freezeMinutes?: number | null }) {
  const ms = durationMs(data)
  if (ms == null || ms <= 0 || !data.freezeMinutes) return true
  return data.freezeMinutes * 60_000 < ms
}

export const createContestSchema = baseContestSchema
  .refine(hasValidTeamSizes, { message: 'Define el tamaño mínimo y máximo de equipo', path: ['teamSizeMax'] })
  .refine(teamSizeMaxAboveMin, { message: 'El tamaño máximo debe ser mayor o igual al mínimo', path: ['teamSizeMax'] })
  .refine(endAfterStart, { message: 'La fecha de fin debe ser posterior a la fecha de inicio', path: ['endTime'] })
  .refine(freezeShorterThanDuration, { message: 'El freeze debe ser menor que la duración de la competencia', path: ['freezeMinutes'] })

export type CreateContestFormData = z.infer<typeof createContestSchema>

export const updateContestSchema = baseContestSchema.partial()
  .refine(hasValidTeamSizes, { message: 'Define el tamaño mínimo y máximo de equipo', path: ['teamSizeMax'] })
  .refine(teamSizeMaxAboveMin, { message: 'El tamaño máximo debe ser mayor o igual al mínimo', path: ['teamSizeMax'] })
  .refine(endAfterStart, { message: 'La fecha de fin debe ser posterior a la fecha de inicio', path: ['endTime'] })
  .refine(freezeShorterThanDuration, { message: 'El freeze debe ser menor que la duración de la competencia', path: ['freezeMinutes'] })

export type UpdateContestFormData = z.infer<typeof updateContestSchema>
