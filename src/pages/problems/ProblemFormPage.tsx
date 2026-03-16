import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppLayout } from '@/components/layout'
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToastContext } from '@/components/ui/ToastProvider'
import { useCreateProblem, useUpdateProblem, useProblemDetail } from '@/hooks/api/useProblems'
import { createProblemSchema, updateProblemSchema, type CreateProblemFormData, type UpdateProblemFormData } from '@/lib/schemas/problem'
import { ApiClientError } from '@/api/client'

export function ProblemFormPage() {
  const { slug } = useParams<{ slug: string }>()
  const isEditing = !!slug
  const navigate = useNavigate()
  const { toast } = useToastContext()

  const { data: existingProblem, isLoading: isLoadingProblem } = useProblemDetail(slug || '')
  const createMutation = useCreateProblem()
  const updateMutation = useUpdateProblem()

  if (isEditing && isLoadingProblem) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Problemas', href: '/problems' }, { label: 'Cargando...' }]}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    )
  }

  if (isEditing && existingProblem?.status === 'PUBLISHED') {
    return (
      <AppLayout breadcrumbs={[{ label: 'Problemas', href: '/problems' }, { label: existingProblem.title }]}>
        <div className="text-center py-12">
          <p className="text-neutral-text-muted">No se puede editar un problema publicado. Despublícalo primero.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/problems/${slug}`)}>
            Volver al detalle
          </Button>
        </div>
      </AppLayout>
    )
  }

  const breadcrumbs = [
    { label: 'Problemas', href: '/problems' },
    ...(isEditing ? [{ label: existingProblem?.title || slug!, href: `/problems/${slug}` }, { label: 'Editar' }] : [{ label: 'Crear problema' }]),
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      {isEditing ? (
        <EditForm
          problem={existingProblem!}
          onSubmit={(data) => {
            const tags = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
            updateMutation.mutate(
              { slug: slug!, data: { ...data, tags } },
              {
                onSuccess: () => {
                  toast({ variant: 'success', title: 'Problema actualizado' })
                  navigate(`/problems/${slug}`)
                },
                onError: (err) => {
                  const msg = err instanceof ApiClientError ? err.message : 'Error al actualizar'
                  toast({ variant: 'error', title: msg })
                },
              },
            )
          }}
          isSubmitting={updateMutation.isPending}
          onCancel={() => navigate(`/problems/${slug}`)}
        />
      ) : (
        <CreateForm
          onSubmit={(data) => {
            const tags = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
            createMutation.mutate(
              { slug: data.slug, title: data.title, statement: data.statement || undefined, timeLimit: data.timeLimit, memoryLimit: data.memoryLimit, tags },
              {
                onSuccess: (created) => {
                  toast({ variant: 'success', title: 'Problema creado' })
                  navigate(`/problems/${created.slug}`)
                },
                onError: (err) => {
                  const msg = err instanceof ApiClientError ? err.message : 'Error al crear'
                  toast({ variant: 'error', title: msg })
                },
              },
            )
          }}
          isSubmitting={createMutation.isPending}
          onCancel={() => navigate('/problems')}
        />
      )}
    </AppLayout>
  )
}

// === Create Form ===

function CreateForm({ onSubmit, isSubmitting, onCancel }: {
  onSubmit: (data: CreateProblemFormData) => void
  isSubmitting: boolean
  onCancel: () => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateProblemFormData>({
    resolver: zodResolver(createProblemSchema),
    defaultValues: { slug: '', title: '', statement: '', tags: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-text-primary">Crear problema</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>Crear</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Información básica</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input label="Slug" {...register('slug')} error={errors.slug?.message} placeholder="ej: two-sum" />
          <Input label="Título" {...register('title')} error={errors.title?.message} placeholder="Título del problema" />
          <Textarea label="Enunciado (LaTeX)" {...register('statement')} error={errors.statement?.message} rows={8} placeholder="Escribe el enunciado del problema..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Límites</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Tiempo límite (ms)" type="number" {...register('timeLimit', { valueAsNumber: true })} error={errors.timeLimit?.message} placeholder="2000" />
          <Input label="Memoria límite (MiB)" type="number" {...register('memoryLimit', { valueAsNumber: true })} error={errors.memoryLimit?.message} placeholder="256" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
        <CardContent>
          <Input label="Tags (separados por coma)" {...register('tags')} error={errors.tags?.message} placeholder="arrays, hash-table, dp" />
        </CardContent>
      </Card>
    </form>
  )
}

// === Edit Form ===

import type { ProblemDetail } from '@/types/problem'

function EditForm({ problem, onSubmit, isSubmitting, onCancel }: {
  problem: ProblemDetail
  onSubmit: (data: UpdateProblemFormData) => void
  isSubmitting: boolean
  onCancel: () => void
}) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<UpdateProblemFormData>({
    resolver: zodResolver(updateProblemSchema),
    defaultValues: {
      title: problem.title,
      statement: problem.statement || '',
      timeLimit: problem.timeLimit || undefined,
      memoryLimit: problem.memoryLimit || undefined,
      tags: problem.tags.join(', '),
      accessibility: problem.accessibility,
    },
  })

  const accessibility = watch('accessibility')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-text-primary">Editar problema</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>Guardar</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Información básica</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-text-primary mb-1">Slug</label>
            <div className="font-mono text-sm text-neutral-text-muted bg-neutral-surface px-3 py-2 rounded-md">{problem.slug}</div>
            <p className="text-xs text-neutral-text-muted mt-1">El slug no se puede cambiar</p>
          </div>
          <Input label="Título" {...register('title')} error={errors.title?.message} />
          <Textarea label="Enunciado (LaTeX)" {...register('statement')} error={errors.statement?.message} rows={8} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Límites</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Tiempo límite (ms)" type="number" {...register('timeLimit', { valueAsNumber: true })} error={errors.timeLimit?.message} />
          <Input label="Memoria límite (MiB)" type="number" {...register('memoryLimit', { valueAsNumber: true })} error={errors.memoryLimit?.message} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Configuración</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input label="Tags (separados por coma)" {...register('tags')} error={errors.tags?.message} />
          <div>
            <label className="block text-sm font-medium text-neutral-text-primary mb-1">Accesibilidad</label>
            <Select value={accessibility} onValueChange={(v) => setValue('accessibility', v as 'PUBLIC' | 'PRIVATE')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">Privado — Solo modificadores pueden agregar a contests</SelectItem>
                <SelectItem value="PUBLIC">Público — Cualquier creador de contest puede usarlo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
