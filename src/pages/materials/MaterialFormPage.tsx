import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EntityFormPage } from '@/components/patterns'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { MarkdownRenderer } from '@/components/features/MarkdownRenderer'
import {
  useMaterialDetail, useCreateMaterial, useUpdateMaterial,
} from '@/hooks/api/useMaterials'
import { useToastContext } from '@/components/layout/ToastProvider'
import {
  createMaterialSchema, updateMaterialSchema,
  type CreateMaterialFormData,
} from '@/lib/schemas/material'
import { X } from 'lucide-react'

export function MaterialFormPage() {
  const { groupId, materialId } = useParams<{ groupId: string; materialId: string }>()
  const navigate = useNavigate()
  const { toast } = useToastContext()
  const isEditing = !!materialId

  const { data: existing, isLoading: isLoadingDetail } = useMaterialDetail(
    groupId!, materialId ?? '',
  )
  const createMutation = useCreateMaterial()
  const updateMutation = useUpdateMaterial()

  const schema = isEditing ? updateMaterialSchema : createMaterialSchema
  const form = useForm<CreateMaterialFormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', content: '', tags: [] },
  })

  const [tagInput, setTagInput] = useState('')
  const tags = form.watch('tags') ?? []
  const content = form.watch('content') ?? ''

  useEffect(() => {
    if (existing && isEditing) {
      form.reset({ title: existing.title, content: existing.content, tags: existing.tags })
    }
  }, [existing, isEditing, form])

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag || tags.includes(tag)) { setTagInput(''); return }
    form.setValue('tags', [...tags, tag])
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    form.setValue('tags', tags.filter((t) => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
  }

  const onSubmit = async (data: CreateMaterialFormData) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ groupId: groupId!, materialId: materialId!, data })
        toast({ variant: 'success', title: 'Material actualizado' })
        navigate(`/groups/${groupId}/materials/${materialId}`)
      } else {
        const created = await createMutation.mutateAsync({ groupId: groupId!, data })
        toast({ variant: 'success', title: 'Material creado' })
        navigate(`/groups/${groupId}/materials/${created.id}`)
      }
    } catch {
      toast({ variant: 'error', title: isEditing ? 'Error al actualizar' : 'Error al crear' })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

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
        { label: 'Grupo', href: `/groups/${groupId}` },
        { label: 'Materiales', href: `/groups/${groupId}/materials` },
        { label: isEditing ? 'Editar' : 'Nuevo' },
      ]}
      onSubmit={form.handleSubmit(onSubmit)}
      onCancel={() => navigate(isEditing ? `/groups/${groupId}/materials/${materialId}` : `/groups/${groupId}/materials`)}
      isSubmitting={isSubmitting}
      isLoading={isEditing && isLoadingDetail}
      sections={sections}
    >
      {null}
    </EntityFormPage>
  )
}
