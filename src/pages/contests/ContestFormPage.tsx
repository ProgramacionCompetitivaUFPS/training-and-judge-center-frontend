import { type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Calendar, Settings, Clock } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Input, Textarea, Checkbox, Card, CardContent } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { useContestDetail, useCreateContest, useUpdateContest } from '@/hooks/api/useContests'
import { useGroupDetail } from '@/hooks/api/useGroups'
import { useToast } from '@/hooks/useToast'
import { createContestSchema, type CreateContestFormData } from '@/lib/schemas/contest'

function formatDurationFromDates(start: string, end: string): string {
  if (!start || !end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms <= 0) return 'Inválido'
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}

export function ContestFormPage() {
  const { groupId, id } = useParams<{ groupId: string; id?: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isEditing = !!id

  const { data: existing, isLoading: isLoadingExisting } = useContestDetail(id || '')
  const { data: groupDetail } = useGroupDetail(groupId || '')
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
      freezeMinutes: 60,
      enablePostContest: false,
    },
    values: isEditing && existing
      ? {
          name: existing.name,
          description: existing.description || '',
          startTime: existing.startTime.slice(0, 16),
          endTime: existing.endTime.slice(0, 16),
          penalty: existing.penalty,
          freezeMinutes: existing.freezeMinutes,
          enablePostContest: existing.enablePostContest,
        }
      : undefined,
  })

  const { register, handleSubmit, formState: { errors }, setValue, control } = form
  const enablePostContest = useWatch({ control, name: 'enablePostContest' })
  const startTime = useWatch({ control, name: 'startTime' })
  const endTime = useWatch({ control, name: 'endTime' })

  const onSubmit = (data: CreateContestFormData) => {
    const payload = {
      ...data,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
      description: data.description || undefined,
    }

    if (isEditing && groupId && id) {
      const { problems: _unusedProblems, ...updatePayload } = payload
      updateMutation.mutate(
        { groupId, contestId: id, data: updatePayload },
        {
          onSuccess: () => {
            toast({ variant: 'success', title: 'Actualizado', description: 'Contest actualizado' })
            navigate(`/contests/${id}`)
          },
          onError: () => toast({ variant: 'error', title: 'Error', description: 'No se pudo actualizar' }),
        },
      )
    } else if (groupId) {
      createMutation.mutate(
        { groupId, data: payload },
        {
          onSuccess: (created) => {
            toast({ variant: 'success', title: 'Creado', description: 'Contest creado exitosamente' })
            navigate(`/contests/${created.id}`)
          },
          onError: () => toast({ variant: 'error', title: 'Error', description: 'No se pudo crear' }),
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

  if (isEditing && isLoadingExisting) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-64 w-full" />
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
              {isEditing ? 'Modifica la configuración del contest' : 'Configura una nueva competencia para el grupo'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
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
                placeholder="Ej: Contest Semanal #15"
              />
              <Textarea
                label="Descripción"
                {...register('description')}
                error={errors.description?.message}
                placeholder="Descripción del contest (opcional)"
                rows={3}
              />
            </div>
          </FormSection>

          <FormSection icon={<Calendar className="h-4 w-4" />} title="Horario">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Fecha y hora de inicio"
                  type="datetime-local"
                  {...register('startTime')}
                  error={errors.startTime?.message}
                />
                <Input
                  label="Fecha y hora de fin"
                  type="datetime-local"
                  {...register('endTime')}
                  error={errors.endTime?.message}
                />
              </div>
              {startTime && endTime && (
                <div className="flex items-center gap-2 text-sm text-neutral-text-muted bg-neutral-surface rounded-lg px-4 py-2">
                  <Clock className="h-4 w-4" />
                  <span>Duración: <span className="font-mono font-bold text-neutral-text-primary">{formatDurationFromDates(startTime, endTime)}</span></span>
                </div>
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
                <Input
                  label="Freeze (minutos antes del fin)"
                  type="number"
                  {...register('freezeMinutes')}
                  error={errors.freezeMinutes?.message}
                  placeholder="60"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={enablePostContest || false}
                  onCheckedChange={(checked) => setValue('enablePostContest', !!checked)}
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
