import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EntityFormPage } from '@/components/patterns'
import { AppLayout } from '@/components/layout/AppLayout'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { MarkdownRenderer } from '@/components/features/MarkdownRenderer'
import {
  useMaterialDetail, useCreateMaterial, useUpdateMaterial, useMaterialTags, usePublishMaterial,
} from '@/hooks/api/useMaterials'
import { useGroupDetail } from '@/hooks/api/useGroups'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/hooks/useToastContext'
import {
  createMaterialSchema, updateMaterialSchema,
  type CreateMaterialFormData,
} from '@/lib/schemas/material'
import { X } from 'lucide-react'
import { DEFAULT_MATERIAL_CONTENT_MARKDOWN } from '@/lib/constants'
import { getErrorMessage } from '@/lib/errorMessages'

export function MaterialFormPage() {
  const { groupId, materialId } = useParams<{ groupId: string; materialId: string }>()
  const navigate = useNavigate()
  const { toast } = useToastContext()
  const { user } = useAuth()
  const { data: groupDetail, isLoading: isLoadingGroup } = useGroupDetail(groupId!)
  const isEditing = !!materialId

  const { data: existing, isLoading: isLoadingDetail } = useMaterialDetail(
    groupId!, materialId ?? '',
  )
  const createMutation = useCreateMaterial()
  const updateMutation = useUpdateMaterial()
  const publishMutation = usePublishMaterial()
  // Sugerencias para reusar tags ya existentes en el grupo (evita variantes como "data-structures"
  // vs "data_structures" para lo mismo) — es una muestra de los materiales más recientes, no un
  // registro exhaustivo, así que el usuario sigue pudiendo escribir cualquier tag a mano.
  const { data: tagsData } = useMaterialTags(groupId!)
  const suggestedTags = tagsData?.tags ?? []

  const schema = isEditing ? updateMaterialSchema : createMaterialSchema
  const form = useForm<CreateMaterialFormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', content: '', tags: [] },
  })

  const [tagInput, setTagInput] = useState('')
  const tags = useWatch({ control: form.control, name: 'tags' }) ?? []
  const content = useWatch({ control: form.control, name: 'content' }) ?? ''

  useEffect(() => {
    if (existing && isEditing) {
      form.reset({ title: existing.title, content: existing.content, tags: existing.tags })
    }
  }, [existing, isEditing, form])

  const addTagValue = (tag: string) => {
    if (!tag || tags.includes(tag)) return
    form.setValue('tags', [...tags, tag])
  }

  const addTag = () => {
    addTagValue(tagInput.trim().toLowerCase())
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    form.setValue('tags', tags.filter((t) => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
  }

  // New materials are created as drafts (only leads see them); "Publicar" also publishes it in
  // the same step, so a coach doesn't end up thinking members can already read a draft.
  const save = async (data: CreateMaterialFormData, publish: boolean) => {
    if (!isEditing && data.content.trim() === DEFAULT_MATERIAL_CONTENT_MARKDOWN.trim()) {
      toast({ variant: 'error', title: 'El contenido es la plantilla de ejemplo', description: 'Reemplázala por el contenido real del material antes de guardar.' })
      return
    }
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ groupId: groupId!, materialId: materialId!, data })
        toast({ variant: 'success', title: 'Material actualizado' })
        navigate(`/groups/${groupId}/materials/${materialId}`)
        return
      }
      const created = await createMutation.mutateAsync({ groupId: groupId!, data })
      if (publish) {
        try {
          await publishMutation.mutateAsync({ groupId: groupId!, materialId: created.id })
          toast({ variant: 'success', title: 'Material publicado', description: 'Los miembros del grupo ya pueden verlo.' })
        } catch (err) {
          toast({ variant: 'error', title: 'Se guardó como borrador, pero no se pudo publicar', description: getErrorMessage(err) })
        }
      } else {
        toast({ variant: 'success', title: 'Borrador guardado', description: 'Solo los líderes del grupo lo ven. Publícalo cuando esté listo.' })
      }
      navigate(`/groups/${groupId}/materials/${created.id}`)
    } catch (err) {
      toast({ variant: 'error', title: isEditing ? 'Error al actualizar' : 'Error al crear', description: getErrorMessage(err) })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending || publishMutation.isPending

  // Real leadership of the group, not just having the Coach role platform-wide — the backend
  // already rejects create on a group the Coach doesn't lead (create_material.go); this just
  // prevents a non-lead Coach from reaching the form via direct URL.
  const isLead = user?.role === 'ADMIN' || groupDetail?.userMembership.role === 'LEAD'
  if (groupDetail && !isLead) {
    return (
      <AppLayout breadcrumbs={[
        { label: 'Grupos', href: '/groups' },
        { label: groupDetail?.name ?? 'Grupo', href: `/groups/${groupId}` },
        { label: 'Materiales', href: `/groups/${groupId}/materials` },
        { label: isEditing ? 'Editar' : 'Nuevo' },
      ]}
      >
        <div className="text-center py-12">
          <p className="text-neutral-text-muted">No tienes permiso para {isEditing ? 'editar' : 'crear'} materiales en este grupo.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/groups/${groupId}/materials`)}>
            Volver a materiales
          </Button>
        </div>
      </AppLayout>
    )
  }

  const sections = [
    {
      title: 'Información',
      description: 'Título y tags del material',
      content: (
        <div className="space-y-4">
          <Input
            label="Título"
            {...form.register('title')}
            error={form.formState.errors.title?.message}
            placeholder="Título del material"
          />
          <div>
            <label className="text-sm font-medium mb-1 block">Tags</label>
            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Escribe un tag y presiona Enter"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                Agregar
              </Button>
            </div>
            {suggestedTags.filter((t) => !tags.includes(t)).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-xs text-neutral-text-muted mr-1">Ya usados en el grupo:</span>
                {suggestedTags.filter((t) => !tags.includes(t)).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTagValue(tag)}
                    className="px-2.5 py-0.5 rounded-pill text-xs font-medium bg-neutral-border/50 text-neutral-text-primary hover:bg-neutral-border transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-status-error">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {form.formState.errors.tags?.message && (
              <p className="text-sm text-status-error mt-1">{form.formState.errors.tags.message}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Contenido',
      description: 'Escribe en Markdown. Puedes incluir imágenes, links y videos de YouTube/Vimeo.',
      content: (
        <Tabs defaultValue="edit">
          {!content.trim() && (
            <div className="flex justify-end mb-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => form.setValue('content', DEFAULT_MATERIAL_CONTENT_MARKDOWN, { shouldDirty: true })}
              >
                Insertar plantilla de ejemplo
              </Button>
            </div>
          )}
          <TabsList>
            <TabsTrigger value="edit">Editar</TabsTrigger>
            <TabsTrigger value="preview">Vista previa</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea
              {...form.register('content')}
              error={form.formState.errors.content?.message}
              rows={20}
              placeholder={'# Mi Material\n\nEscribe aquí el contenido en Markdown...'}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-neutral-text-muted">
                Soporta Markdown, código con sintaxis y fórmulas matemáticas con <code className="bg-brand-primary-muted text-brand-primary px-1 rounded">$...$</code> (inline) y <code className="bg-brand-primary-muted text-brand-primary px-1 rounded">$$...$$</code> (bloque).
              </p>
              <p className="text-xs text-neutral-text-muted">
                {content.length} / 50000
              </p>
            </div>
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-[300px] rounded-lg border border-neutral-border p-4">
              {content ? (
                <MarkdownRenderer content={content} />
              ) : (
                <p className="text-neutral-text-muted">Sin contenido para previsualizar</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      ),
    },
  ]

  return (
    <EntityFormPage
      title={isEditing ? 'Editar Material' : 'Nuevo Material'}
      description={isEditing ? 'Modifica el contenido del material' : 'Crea un nuevo material para el grupo'}
      breadcrumbs={[
        { label: 'Grupos', href: '/groups' },
        { label: groupDetail?.name ?? 'Grupo', href: `/groups/${groupId}` },
        { label: 'Materiales', href: `/groups/${groupId}/materials` },
        { label: isEditing ? 'Editar' : 'Nuevo' },
      ]}
      onSubmit={form.handleSubmit((data) => save(data, true))}
      submitLabel={isEditing ? 'Guardar cambios' : 'Publicar'}
      additionalActions={!isEditing && (
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={form.handleSubmit((data) => save(data, false))}
        >
          Guardar borrador
        </Button>
      )}
      onCancel={() => navigate(isEditing ? `/groups/${groupId}/materials/${materialId}` : `/groups/${groupId}/materials`)}
      isSubmitting={isSubmitting}
      isLoading={(isEditing && isLoadingDetail) || isLoadingGroup}
      sections={sections}
    >
      {null}
    </EntityFormPage>
  )
}
