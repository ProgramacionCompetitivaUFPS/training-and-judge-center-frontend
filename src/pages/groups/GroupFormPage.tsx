import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EntityFormPage } from '@/components/patterns'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/Select'
import { useGroupDetail, useCreateGroup, useUpdateGroup } from '@/hooks/api/useGroups'
import { useToastContext } from '@/hooks/useToastContext'
import { createGroupSchema, type CreateGroupFormData } from '@/lib/schemas/group'
import { ROUTES } from '@/lib/constants'
import type { GroupVisibility, GroupJoinPolicy } from '@/types/group'

export function GroupFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToastContext()
  const isEdit = !!id

  const { data: group, isLoading: isLoadingGroup } = useGroupDetail(id ?? '')
  const createMutation = useCreateGroup()
  const updateMutation = useUpdateGroup()

  const [initialLeads, setInitialLeads] = useState('')
  const [initialMembers, setInitialMembers] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      visibility: 'VISIBLE',
      joinPolicy: 'OPEN',
    },
  })

  const visibility = useWatch({ control, name: 'visibility' })
  const joinPolicy = useWatch({ control, name: 'joinPolicy' })

  useEffect(() => {
    if (isEdit && group) {
      reset({
        name: group.name,
        description: group.description ?? '',
        visibility: group.visibility,
        joinPolicy: group.joinPolicy,
      })
    }
  }, [isEdit, group, reset])

  const onSubmit = async (data: CreateGroupFormData) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data })
        toast({ variant: 'success', title: 'Grupo actualizado' })
      } else {
        const leadNicknames = initialLeads.split(',').map((s) => s.trim()).filter(Boolean)
        const memberNicknames = initialMembers.split(',').map((s) => s.trim()).filter(Boolean)
        await createMutation.mutateAsync({
          ...data,
          ...(leadNicknames.length > 0 && { initialLeadNicknames: leadNicknames }),
          ...(memberNicknames.length > 0 && { initialMemberNicknames: memberNicknames }),
        })
        toast({ variant: 'success', title: 'Grupo creado' })
      }
      navigate(ROUTES.GROUPS)
    } catch {
      toast({ variant: 'error', title: isEdit ? 'Error al actualizar grupo' : 'Error al crear grupo' })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <EntityFormPage
      title={isEdit ? 'Editar Grupo' : 'Crear Grupo'}
      description={isEdit ? 'Modifica la configuración del grupo' : 'Configura un nuevo grupo de entrenamiento'}
      breadcrumbs={[
        { label: 'Grupos', href: ROUTES.GROUPS },
        ...(isEdit && group ? [{ label: group.name, href: `/groups/${id}` }] : []),
        { label: isEdit ? 'Editar' : 'Crear' },
      ]}
      onSubmit={handleSubmit(onSubmit)}
      onCancel={() => navigate(-1)}
      isLoading={isEdit && isLoadingGroup}
      isSubmitting={isSubmitting}
      submitLabel={isEdit ? 'Guardar Cambios' : 'Crear Grupo'}
    >
      <div className="space-y-4">
        <Input
          label="Nombre del grupo"
          {...register('name')}
          error={errors.name?.message}
          placeholder="Ej: Entrenamiento ICPC Colombia"
        />

        <Textarea
          label="Descripción"
          {...register('description')}
          error={errors.description?.message}
          placeholder="Describe el propósito del grupo..."
          rows={3}
        />

        <div>
          <label className="text-sm font-medium mb-1 block">Visibilidad</label>
          <Select
            value={visibility}
            onValueChange={(v) => {
              setValue('visibility', v as GroupVisibility, { shouldValidate: true })
              if (v === 'NOT_VISIBLE') {
                setValue('joinPolicy', 'INVITE', { shouldValidate: true })
              }
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="VISIBLE">Visible — Aparece en el listado público</SelectItem>
              <SelectItem value="NOT_VISIBLE">No visible — Solo accesible por invitación</SelectItem>
            </SelectContent>
          </Select>
          {errors.visibility && <p className="text-sm text-status-error mt-1">{errors.visibility.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Política de ingreso</label>
          <Select
            value={joinPolicy}
            onValueChange={(v) => setValue('joinPolicy', v as GroupJoinPolicy, { shouldValidate: true })}
            disabled={visibility === 'NOT_VISIBLE'}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Abierto — Cualquiera puede unirse</SelectItem>
              <SelectItem value="REQUEST">Solicitud — Requiere aprobación de un líder</SelectItem>
              <SelectItem value="INVITE">Invitación — Solo por invitación de un líder</SelectItem>
            </SelectContent>
          </Select>
          {errors.joinPolicy && <p className="text-sm text-status-error mt-1">{errors.joinPolicy.message}</p>}
          {visibility === 'NOT_VISIBLE' && (
            <p className="text-xs text-neutral-text-muted mt-1">Los grupos no visibles solo permiten política de invitación</p>
          )}
        </div>

        {!isEdit && (
          <>
            <Input
              label="Líderes iniciales (nicknames separados por coma)"
              value={initialLeads}
              onChange={(e) => setInitialLeads(e.target.value)}
              placeholder="coach_john, coach_mary"
            />
            <p className="text-xs text-neutral-text-muted -mt-3">Solo coaches o admins pueden ser líderes</p>

            <Input
              label="Miembros iniciales (nicknames separados por coma)"
              value={initialMembers}
              onChange={(e) => setInitialMembers(e.target.value)}
              placeholder="student_alice, student_bob"
            />
          </>
        )}
      </div>
    </EntityFormPage>
  )
}
