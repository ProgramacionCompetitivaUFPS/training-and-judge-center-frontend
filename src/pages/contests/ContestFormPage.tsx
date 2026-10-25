import { type ReactNode, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Calendar, Settings, Clock, UsersRound } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Input, Textarea, Checkbox, Card, CardContent } from '@/components/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useContestDetail, useCreateContest, useUpdateContest } from '@/hooks/api/useContests'
import { PATHS } from '@/lib/constants'
import { useGroupDetail } from '@/hooks/api/useGroups'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/hooks/useToastContext'
import { ApiClientError } from '@/lib/errors'
import { getErrorMessage } from '@/lib/errorMessages'
import { createContestSchema, type CreateContestFormData } from '@/lib/schemas/contest'
import type { ParticipationMode, UpdateContestRequest } from '@/types/contest'

function formatDurationFromDates(start: string, end: string): string {
  if (!start || !end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms <= 0) return 'Inválido'
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}

// datetime-local reads its value as local time, so an ISO string in UTC can't just be sliced —
// that shifts the contest by the UTC offset every time it's edited and saved.
function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const FREEZE_DEFAULT_MIN_DURATION_MS = 4 * 60 * 60 * 1000

export function ContestFormPage() {
  const { groupId, id } = useParams<{ groupId: string; id?: string }>()
  const navigate = useNavigate()
  const { toast } = useToastContext()
  const { user } = useAuth()
  const isEditing = !!id

  const { data: existing, isLoading: isLoadingExisting } = useContestDetail(groupId || '', id || '')
  const { data: groupDetail, isLoading: isLoadingGroup } = useGroupDetail(groupId || '')
  const createMutation = useCreateContest()
  const updateMutation = useUpdateContest()

  const form = useForm<CreateContestFormData>({
    resolver: zodResolver(createContestSchema),
    defaultValues: {
      name: '',
      description: '',
      startTime: '',
      endTime: '',
      penalty: 20,
      freezeMinutes: 0,
      enablePostContest: false,
      participationMode: 'INDIVIDUAL',
      showTeamMembers: false,
    },
    values: isEditing && existing
      ? {
          name: existing.name,
          description: existing.description || '',
          startTime: toDateTimeLocalValue(existing.startTime),
          endTime: toDateTimeLocalValue(existing.endTime),
          penalty: existing.penalty,
          freezeMinutes: existing.freezeMinutes,
          enablePostContest: existing.enablePostContest,
          participationMode: existing.participationMode,
          teamSizeMin: existing.teamSizeMin,
          teamSizeMax: existing.teamSizeMax,
          showTeamMembers: existing.showTeamMembers,
        }
      : undefined,
  })

  const { register, handleSubmit, formState: { errors, dirtyFields }, setValue, control } = form
  const enablePostContest = useWatch({ control, name: 'enablePostContest' })
  const startTime = useWatch({ control, name: 'startTime' })
  const endTime = useWatch({ control, name: 'endTime' })
  const participationMode = useWatch({ control, name: 'participationMode' })
  const showTeamMembers = useWatch({ control, name: 'showTeamMembers' })
  const isTeamMode = participationMode === 'TEAM' || participationMode === 'MIXED'
  // The backend rejects a start (or end) time in the past, and moving either one after the fact
  // would shift every submission's time and penalty — so once started, only the end can move
  // (e.g. extending a running contest), and once finished, neither.
  const startLocked = isEditing && !!existing && existing.status !== 'SCHEDULED'
  const endLocked = isEditing && existing?.status === 'FINISHED'

  // Same default the backend applies when freeze is omitted (create_contest.go): 60 min for
  // contests of 4 h or more, none for shorter ones. Follows the dates until the user edits it,
  // so a 90-min class practice isn't frozen for two thirds of its duration by default.
  const freezeTouched = !!dirtyFields.freezeMinutes
  useEffect(() => {
    if (isEditing || freezeTouched || !startTime || !endTime) return
    const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime()
    if (!(durationMs > 0)) return
    setValue('freezeMinutes', durationMs >= FREEZE_DEFAULT_MIN_DURATION_MS ? 60 : 0, { shouldValidate: true })
  }, [isEditing, freezeTouched, startTime, endTime, setValue])

  const onSubmit = (data: CreateContestFormData) => {
    const payload = {
      ...data,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
      description: data.description || undefined,
    }

    if (isEditing && groupId && id) {
      // Only send what the user changed: the backend re-validates every field it receives, so
      // resending an untouched startTime breaks editing a contest that already started
      // (START_TIME_IN_PAST), and an untouched participationMode breaks it once teams registered.
      const updatePayload: UpdateContestRequest = {}
      if (dirtyFields.name) updatePayload.name = payload.name
      if (dirtyFields.description) updatePayload.description = data.description || null
      if (dirtyFields.startTime) updatePayload.startTime = payload.startTime
      if (dirtyFields.endTime) updatePayload.endTime = payload.endTime
      if (dirtyFields.penalty) updatePayload.penalty = payload.penalty
      if (dirtyFields.freezeMinutes) updatePayload.freezeMinutes = payload.freezeMinutes
      if (dirtyFields.enablePostContest) updatePayload.enablePostContest = payload.enablePostContest
      if (dirtyFields.participationMode) updatePayload.participationMode = payload.participationMode
      if (dirtyFields.teamSizeMin) updatePayload.teamSizeMin = payload.teamSizeMin
      if (dirtyFields.teamSizeMax) updatePayload.teamSizeMax = payload.teamSizeMax
      if (dirtyFields.showTeamMembers) updatePayload.showTeamMembers = payload.showTeamMembers

      if (Object.keys(updatePayload).length === 0) {
        navigate(PATHS.contest(groupId, id))
        return
      }

      updateMutation.mutate(
        { groupId, contestId: id, data: updatePayload },
        {
          onSuccess: () => {
            toast({ variant: 'success', title: 'Actualizado', description: 'Competencia actualizada' })
            navigate(PATHS.contest(groupId, id))
          },
          onError: (err) => {
            if (err instanceof ApiClientError && err.code === 'CONTEST_HAS_TEAM_REGISTRATIONS') {
              toast({ variant: 'error', title: 'No se puede cambiar la modalidad', description: 'Ya hay equipos registrados en esta competencia.' })
            } else {
              toast({ variant: 'error', title: 'No se pudo actualizar', description: getErrorMessage(err) })
            }
          },
        },
      )
    } else if (groupId) {
      createMutation.mutate(
        { groupId, data: payload },
        {
          onSuccess: (created) => {
            toast({ variant: 'success', title: 'Creado', description: 'Competencia creada exitosamente' })
            navigate(PATHS.contest(groupId, created.id))
          },
          onError: (err) => toast({ variant: 'error', title: 'No se pudo crear', description: getErrorMessage(err) }),
        },
      )
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const breadcrumbs = [
    { label: 'Grupos', href: '/groups' },
    { label: groupDetail?.name ?? 'Grupo', href: `/groups/${groupId}` },
    { label: isEditing ? 'Editar competencia' : 'Nueva competencia' },
  ]

  if ((isEditing && isLoadingExisting) || isLoadingGroup) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    )
  }

  // Real leadership of the group, not just having the Coach role platform-wide — the backend
  // already rejects create/update on a group the Coach doesn't lead (create_contest.go,
  // update_contest.go); this just prevents a non-lead Coach from reaching the form via direct URL.
  const isLead = user?.role === 'ADMIN' || groupDetail?.userMembership.role === 'LEAD'
  if (groupDetail && !isLead) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <p className="text-neutral-text-muted">No tienes permiso para {isEditing ? 'editar' : 'crear'} competencias en este grupo.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/groups/${groupId}`)}>
            Volver al grupo
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-text-primary">
              {isEditing ? 'Editar competencia' : 'Nueva competencia'}
            </h1>
            <p className="text-sm text-neutral-text-muted mt-1">
              {isEditing ? 'Modifica la configuración de la competencia' : 'Configura una nueva competencia para el grupo'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEditing && groupId && id ? PATHS.contest(groupId, id) : `/groups/${groupId}`)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isEditing ? 'Guardar cambios' : 'Crear competencia'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <FormSection icon={<Info className="h-4 w-4" />} title="Información básica">
            <div className="space-y-4">
              <Input
                label="Nombre"
                {...register('name')}
                error={errors.name?.message}
                placeholder="Ej: Competencia Semanal #15"
              />
              <Textarea
                label="Descripción"
                {...register('description')}
                error={errors.description?.message}
                placeholder="Descripción de la competencia (opcional)"
                rows={3}
              />
            </div>
          </FormSection>

          <FormSection icon={<Calendar className="h-4 w-4" />} title="Horario">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* readOnly, not disabled: react-hook-form drops disabled values from the submit data,
                    which the freeze-vs-duration check still needs. */}
                <Input
                  label="Fecha y hora de inicio"
                  type="datetime-local"
                  {...register('startTime')}
                  readOnly={startLocked}
                  className={startLocked ? 'bg-neutral-background text-neutral-text-muted cursor-not-allowed' : undefined}
                  error={errors.startTime?.message}
                />
                <Input
                  label="Fecha y hora de fin"
                  type="datetime-local"
                  {...register('endTime')}
                  readOnly={endLocked}
                  className={endLocked ? 'bg-neutral-background text-neutral-text-muted cursor-not-allowed' : undefined}
                  error={errors.endTime?.message}
                />
              </div>
              {startLocked && (
                <p className="text-xs text-neutral-text-muted">
                  {endLocked
                    ? 'La competencia ya finalizó: sus fechas no se pueden modificar.'
                    : 'La competencia ya comenzó: la fecha de inicio no se puede modificar, pero puedes extender o adelantar la hora de fin (siempre a un momento futuro).'}
                </p>
              )}
              {startTime && endTime && (
                <div className="flex items-center gap-2 text-sm text-neutral-text-muted bg-neutral-surface rounded-lg px-4 py-2">
                  <Clock className="h-4 w-4" />
                  <span>Duración: <span className="font-mono font-bold text-neutral-text-primary">{formatDurationFromDates(startTime, endTime)}</span></span>
                </div>
              )}
            </div>
          </FormSection>

          <FormSection icon={<UsersRound className="h-4 w-4" />} title="Modalidad">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-text-primary mb-1.5 block">Participación</label>
                <Select
                  value={participationMode}
                  onValueChange={(v) => setValue('participationMode', v as ParticipationMode, { shouldValidate: true, shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="TEAM">Por equipos</SelectItem>
                    <SelectItem value="MIXED">Mixta (individual o equipo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isTeamMode && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Tamaño mínimo de equipo"
                      type="number"
                      {...register('teamSizeMin')}
                      error={errors.teamSizeMin?.message}
                      placeholder="2"
                    />
                    <Input
                      label="Tamaño máximo de equipo"
                      type="number"
                      {...register('teamSizeMax')}
                      error={errors.teamSizeMax?.message}
                      placeholder="4"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={showTeamMembers || false}
                      onCheckedChange={(checked) => setValue('showTeamMembers', !!checked, { shouldDirty: true })}
                    />
                    <label className="text-sm text-neutral-text-primary">
                      Mostrar los miembros del equipo en standings y envíos
                    </label>
                  </div>
                </>
              )}
              {isEditing && (
                <p className="text-xs text-neutral-text-muted">
                  Si la competencia ya tiene equipos registrados, no se puede cambiar la modalidad ni el tamaño de equipo.
                </p>
              )}
            </div>
          </FormSection>

          <FormSection icon={<Settings className="h-4 w-4" />} title="Configuración">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Penalización (minutos)"
                  type="number"
                  {...register('penalty')}
                  error={errors.penalty?.message}
                  placeholder="20"
                />
                <div>
                  <Input
                    label="Freeze (minutos antes del fin)"
                    type="number"
                    {...register('freezeMinutes')}
                    error={errors.freezeMinutes?.message}
                    placeholder="0"
                  />
                  {!isEditing && (
                    <p className="text-xs text-neutral-text-muted mt-1">
                      Por defecto: 60 min si la competencia dura 4 h o más; sin freeze si dura menos.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={enablePostContest || false}
                  onCheckedChange={(checked) => setValue('enablePostContest', !!checked, { shouldDirty: true })}
                />
                <label className="text-sm text-neutral-text-primary">
                  Habilitar post-competencia (submissions después del fin no afectan standings)
                </label>
              </div>
            </div>
          </FormSection>
        </div>
      </form>
    </AppLayout>
  )
}

// === Sub-components ===

interface FormSectionProps {
  icon: ReactNode
  title: string
  children: ReactNode
}

function FormSection({ icon, title, children }: FormSectionProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-brand-primary-muted flex items-center justify-center text-brand-primary">
            {icon}
          </div>
          <h3 className="text-lg font-bold text-neutral-text-primary">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
