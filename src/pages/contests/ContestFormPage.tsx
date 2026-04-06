import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EntityFormPage } from '@/components/patterns'
import { Input, Textarea, Checkbox } from '@/components/ui'
import { useContestDetail, useCreateContest, useUpdateContest } from '@/hooks/api/useContests'
import { useToast } from '@/hooks/useToast'
import { createContestSchema, type CreateContestFormData } from '@/lib/schemas/contest'

export function ContestFormPage() {
  const { groupId, id } = useParams<{ groupId: string; id?: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isEditing = !!id

  const { data: existing, isLoading: isLoadingExisting } = useContestDetail(id || '')
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

  const onSubmit = (data: CreateContestFormData) => {
    const payload = {
      ...data,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
      description: data.description || undefined,
    }

    if (isEditing && groupId && id) {
      // Exclude problems from update payload — update uses a different shape
      const { problems: _problems, ...updatePayload } = payload
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

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form

  return (
    <EntityFormPage
      title={isEditing ? 'Editar competencia' : 'Nueva competencia'}
      breadcrumbs={[
        { label: 'Competencias', href: '/contests' },
        { label: isEditing ? 'Editar' : 'Nueva' },
      ]}
      isLoading={isEditing && isLoadingExisting}
      isSubmitting={createMutation.isPending || updateMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
      onCancel={() => navigate(-1)}
      sections={[
        {
          title: 'Información básica',
          content: (
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
          ),
        },
        {
          title: 'Horario',
          content: (
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
          ),
        },
        {
          title: 'Configuración',
          content: (
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
                  checked={watch('enablePostContest') || false}
                  onCheckedChange={(checked) => setValue('enablePostContest', !!checked)}
                />
                <label className="text-sm text-neutral-text">
                  Habilitar post-competencia (submissions después del fin no afectan standings)
                </label>
              </div>
            </div>
          ),
        },
      ]}
    >
      {null}
    </EntityFormPage>
  )
}
