import { useEffect, useState, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Eye, UserPlus, Users } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
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
    register, handleSubmit, setValue, control, reset, formState: { errors },
  } = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: '', description: '', visibility: 'VISIBLE', joinPolicy: 'OPEN' },
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
        navigate(`/groups/${id}`)
      } else {
        const leadNicknames = initialLeads.split(',').map((s) => s.trim()).filter(Boolean)
        const memberNicknames = initialMembers.split(',').map((s) => s.trim()).filter(Boolean)
        await createMutation.mutateAsync({
          ...data,
          ...(leadNicknames.length > 0 && { initialLeadNicknames: leadNicknames }),
          ...(memberNicknames.length > 0 && { initialMemberNicknames: memberNicknames }),
        })
        toast({ variant: 'success', title: 'Grupo creado' })
        navigate(ROUTES.GROUPS)
      }
    } catch {
      toast({ variant: 'error', title: isEdit ? 'Error al actualizar grupo' : 'Error al crear grupo' })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const breadcrumbs = [
    { label: 'Grupos', href: ROUTES.GROUPS },
    ...(isEdit && group ? [{ label: group.name, href: `/groups/${id}` }] : []),
    { label: isEdit ? 'Editar' : 'Crear' },
  ]

  if (isEdit && isLoadingGroup) {
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
              {isEdit ? 'Configuración del grupo' : 'Crear grupo'}
            </h1>
            <p className="text-sm text-neutral-text-muted mt-1">
              {isEdit ? 'Modifica la configuración del grupo' : 'Configura un nuevo grupo de entrenamiento'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isEdit ? 'Guardar cambios' : 'Crear grupo'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: Form fields */}
          <div className="space-y-6">
            <FormSection icon={<Info className="h-4 w-4" />} title="Información básica">
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
                  rows={4}
                />
              </div>
            </FormSection>

            <FormSection icon={<Eye className="h-4 w-4" />} title="Visibilidad y acceso">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <SelectItem value="VISIBLE">Visible</SelectItem>
                      <SelectItem value="NOT_VISIBLE">No visible</SelectItem>
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
                      <SelectItem value="OPEN">Abierto</SelectItem>
                      <SelectItem value="REQUEST">Solicitud</SelectItem>
                      <SelectItem value="INVITE">Invitación</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.joinPolicy && <p className="text-sm text-status-error mt-1">{errors.joinPolicy.message}</p>}
                  {visibility === 'NOT_VISIBLE' && (
                    <p className="text-xs text-neutral-text-muted mt-1">Los grupos no visibles solo permiten invitación</p>
                  )}
                </div>
              </div>
            </FormSection>

            {!isEdit && (
              <FormSection icon={<UserPlus className="h-4 w-4" />} title="Miembros iniciales">
                <div className="space-y-4">
                  <Input
                    label="Líderes (nicknames separados por coma)"
                    value={initialLeads}
                    onChange={(e) => setInitialLeads(e.target.value)}
                    placeholder="coach_john, coach_mary"
                  />
                  <p className="text-xs text-neutral-text-muted -mt-3">Solo coaches o admins pueden ser líderes</p>
                  <Input
                    label="Miembros (nicknames separados por coma)"
                    value={initialMembers}
                    onChange={(e) => setInitialMembers(e.target.value)}
                    placeholder="student_alice, student_bob"
                  />
                </div>
              </FormSection>
            )}
          </div>

          {/* Right: Context sidebar */}
          <div className="lg:sticky lg:top-20 lg:h-fit space-y-4">
            {isEdit && group && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-neutral-text-muted" />
                    <span className="text-xs font-bold text-neutral-text-muted uppercase tracking-wider">Estado del grupo</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-text-muted">Miembros</span>
                      <span className="font-mono font-bold">{group.statistics.memberCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-text-muted">Líderes</span>
                      <span className="font-mono font-bold">{group.statistics.leadCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-text-muted">Contests</span>
                      <span className="font-mono font-bold">{group.statistics.contestCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-text-muted">Materiales</span>
                      <span className="font-mono font-bold">{group.statistics.materialCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-brand-primary" />
                  <span className="text-sm font-bold">Sobre la configuración</span>
                </div>
                <p className="text-xs text-neutral-text-muted leading-relaxed">
                  {isEdit
                    ? 'Los cambios de visibilidad y política de ingreso se aplican inmediatamente. Los miembros existentes no se ven afectados.'
                    : 'Después de crear el grupo, podrás gestionar miembros, crear competencias y publicar materiales desde el detalle del grupo.'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
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
