import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileText, Info, Timer, Tags, Settings, Upload, Plus, Trash2, Languages, HelpCircle } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { MarkdownRenderer } from '@/components/features/MarkdownRenderer'
import { useToastContext } from '@/hooks/useToastContext'
import { useCreateProblem, useUpdateProblem, useProblemDetail, useImportProblem, useProblemTags } from '@/hooks/api/useProblems'
import { useAuth } from '@/hooks/useAuth'
import { createProblemSchema, updateProblemSchema, type CreateProblemFormData, type UpdateProblemFormData } from '@/lib/schemas/problem'
import { getErrorMessage } from '@/lib/errorMessages'
import type { ProblemDetail, LanguageOverride } from '@/types/problem'
import { useState, useRef, type ReactNode } from 'react'
import { PROGRAMMING_LANGUAGES, PROBLEM_SOURCE_FILE_EXTENSIONS, DEFAULT_PROBLEM_TIME_LIMIT_MS, DEFAULT_PROBLEM_MEMORY_LIMIT_MB, DEFAULT_PROBLEM_STATEMENT_MARKDOWN } from '@/lib/constants'
import { exceedsZipStructureCheckSize } from '@/lib/zipPeek'
import { reviewProblemPackage, buildPackageTemplate, PACKAGE_LIMITS, type PackageReview } from '@/lib/problemPackage'
import { saveBlobAs } from '@/lib/download'
import { PackageReviewDialog } from '@/components/features/PackageReviewDialog'
import { TagPicker } from '@/components/features/TagPicker'

export function ProblemFormPage() {
  const { slug } = useParams<{ slug: string }>()
  const isEditing = !!slug
  const navigate = useNavigate()
  const { toast } = useToastContext()
  const { user } = useAuth()

  const { data: existingProblem, isLoading: isLoadingProblem } = useProblemDetail(slug || '')
  const createMutation = useCreateProblem()
  const updateMutation = useUpdateProblem()
  const importMutation = useImportProblem()

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

  if (isEditing && existingProblem) {
    const isAdmin = user?.role === 'ADMIN'
    const isAuthor = existingProblem.author.nickname === user?.nickname
    const isModifier = existingProblem.modifiers?.some((m) => m.nickname === user?.nickname)
    if (!isAdmin && !isAuthor && !isModifier) {
      return (
        <AppLayout breadcrumbs={[{ label: 'Problemas', href: '/problems' }, { label: 'Acceso denegado' }]}>
          <div className="text-center py-12">
            <p className="text-neutral-text-muted">No tienes permiso para editar este problema.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(`/problems/${slug}`)}>
              Volver al detalle
            </Button>
          </div>
        </AppLayout>
      )
    }
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
            const languageOverrides = data.languageOverrides?.filter((lo) => lo.language) || []
            updateMutation.mutate(
              { slug: slug!, data: { ...data, tags, languageOverrides } },
              {
                onSuccess: () => {
                  toast({ variant: 'success', title: 'Problema actualizado' })
                  navigate(`/problems/${slug}`)
                },
                onError: (err) => {
                  const msg = getErrorMessage(err, 'Error al actualizar')
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
            const languageOverrides = data.languageOverrides?.filter((lo) => lo.language) || []
            createMutation.mutate(
              { slug: data.slug, title: data.title, statement: data.statement || undefined, timeLimit: data.timeLimit, memoryLimit: data.memoryLimit, languageOverrides, tags },
              {
                onSuccess: (created) => {
                  toast({ variant: 'success', title: 'Problema creado' })
                  navigate(`/problems/${created.slug}`)
                },
                onError: (err) => {
                  const msg = getErrorMessage(err, 'Error al crear')
                  toast({ variant: 'error', title: msg })
                },
              },
            )
          }}
          onImport={(file, slug) => {
            importMutation.mutate({ file, slug }, {
              onSuccess: (created) => {
                toast({ variant: 'success', title: 'Problema importado correctamente' })
                navigate(`/problems/${created.slug}`)
              },
              onError: (err) => {
                const msg = getErrorMessage(err, 'Error al importar')
                toast({ variant: 'error', title: msg })
              },
            })
          }}
          isSubmitting={createMutation.isPending}
          isImporting={importMutation.isPending}
          onCancel={() => navigate('/problems')}
        />
      )}
    </AppLayout>
  )
}

// === Section wrapper with icon ===

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

// The form keeps its tags as one comma-separated string.
function splitTags(value: string | undefined): string[] {
  return value ? value.split(',').map((t) => t.trim()).filter(Boolean) : []
}

// === Language Overrides Editor ===

interface LanguageOverridesEditorProps {
  value: LanguageOverride[]
  onChange: (overrides: LanguageOverride[]) => void
}

function LanguageOverridesEditor({ value, onChange }: LanguageOverridesEditorProps) {
  const usedLanguages = value.map((lo) => lo.language)

  function addOverride() {
    const available = PROGRAMMING_LANGUAGES.find((l) => !usedLanguages.includes(l.value))
    if (!available) return
    onChange([...value, { language: available.value }])
  }

  function removeOverride(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function updateOverride(index: number, field: keyof LanguageOverride, val: string | number | undefined) {
    const updated = [...value]
    updated[index] = { ...updated[index], [field]: val }
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      {value.map((lo, idx) => (
        <div key={idx} className="flex items-end gap-3 p-3 bg-neutral-surface rounded-lg">
          <div className="flex-1">
            <label className="block text-xs text-neutral-text-muted mb-1">Lenguaje</label>
            <Select value={lo.language} onValueChange={(v) => updateOverride(idx, 'language', v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROGRAMMING_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} disabled={usedLanguages.includes(lang.value) && lo.language !== lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <label className="block text-xs text-neutral-text-muted mb-1">Tiempo (ms)</label>
            <Input
              type="number"
              placeholder="—"
              value={lo.timeLimit ?? ''}
              onChange={(e) => updateOverride(idx, 'timeLimit', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div className="w-32">
            <label className="block text-xs text-neutral-text-muted mb-1">Memoria (MiB)</label>
            <Input
              type="number"
              placeholder="—"
              value={lo.memoryLimit ?? ''}
              onChange={(e) => updateOverride(idx, 'memoryLimit', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => removeOverride(idx)}>
            <Trash2 className="h-4 w-4 text-status-error" />
          </Button>
        </div>
      ))}
      {usedLanguages.length < PROGRAMMING_LANGUAGES.length && (
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addOverride}>
          <Plus className="h-3 w-3" />
          Agregar override
        </Button>
      )}
      {value.length === 0 && (
        <p className="text-xs text-neutral-text-muted">Sin overrides. Se usarán los límites globales para todos los lenguajes.</p>
      )}
    </div>
  )
}

// === Create Form ===

interface CreateFormProps {
  onSubmit: (data: CreateProblemFormData) => void
  onImport: (file: File, slug: string) => void
  isSubmitting: boolean
  isImporting: boolean
  onCancel: () => void
}

function CreateForm({ onSubmit, onImport, isSubmitting, isImporting, onCancel }: CreateFormProps) {
  const { register, handleSubmit, formState: { errors }, control, setValue, getValues, trigger } = useForm<CreateProblemFormData>({
    resolver: zodResolver(createProblemSchema),
    defaultValues: {
      slug: '',
      title: '',
      statement: DEFAULT_PROBLEM_STATEMENT_MARKDOWN,
      tags: '',
      languageOverrides: [],
      timeLimit: DEFAULT_PROBLEM_TIME_LIMIT_MS,
      memoryLimit: DEFAULT_PROBLEM_MEMORY_LIMIT_MB,
    },
  })
  const { toast } = useToastContext()

  const statement = useWatch({ control, name: 'statement' })
  const tags = useWatch({ control, name: 'tags' })
  const languageOverrides = useWatch({ control, name: 'languageOverrides' }) || []
  const { data: tagsData, isLoading: isLoadingTags } = useProblemTags()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showZipHelp, setShowZipHelp] = useState(false)
  const [isCheckingZip, setIsCheckingZip] = useState(false)
  // The package the author picked, reviewed and waiting for their go-ahead
  const [pendingImport, setPendingImport] = useState<{ file: File; review: PackageReview } | null>(null)

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (extension !== '.zip') {
      toast({ variant: 'error', title: 'Formato de archivo incorrecto', description: 'El import espera un archivo .zip con el paquete del problema.' })
      return
    }

    const slugValid = await trigger('slug')
    if (!slugValid) return

    if (exceedsZipStructureCheckSize(file)) {
      // Reading a very large ZIP in the browser would spike its memory: the server validates it alone.
      toast({ variant: 'warning', title: 'Paquete grande', description: 'Es demasiado grande para revisarlo aquí; el servidor lo validará al importar.' })
      onImport(file, getValues('slug'))
      return
    }

    setIsCheckingZip(true)
    const review = await reviewProblemPackage(file)
    setIsCheckingZip(false)
    setPendingImport({ file, review })
  }

  async function handleDownloadTemplate() {
    saveBlobAs(await buildPackageTemplate(DEFAULT_PROBLEM_STATEMENT_MARKDOWN), 'plantilla-problema.zip')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h1 className="text-2xl font-extrabold text-neutral-text-primary">Crear problema</h1>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleFileChange} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 text-neutral-text-muted"
            onClick={() => setShowZipHelp((v) => !v)}
          >
            <HelpCircle className="h-4 w-4" />
            Formato del ZIP
          </Button>
          <Button type="button" variant="outline" onClick={handleImportClick} isLoading={isImporting || isCheckingZip} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar ZIP
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>Crear</Button>
        </div>
      </div>

      <PackageReviewDialog
        open={!!pendingImport}
        fileName={pendingImport?.file.name ?? ''}
        slug={getValues('slug')}
        review={pendingImport?.review ?? null}
        isImporting={isImporting}
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          if (!pendingImport) return
          onImport(pendingImport.file, getValues('slug'))
          setPendingImport(null)
        }}
      />

      {showZipHelp && (
        <div className="mb-4 rounded-md border border-neutral-border bg-neutral-surface p-4 text-sm text-neutral-text-muted space-y-2">
          <p className="font-semibold text-neutral-text-primary">Estructura esperada del ZIP (formato ICPC):</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <code className="font-mono">problem.yaml</code> — requerido, en la raíz del problema (máx. 2 MB). Debe
              incluir <code className="font-mono">name</code>; opcionalmente <code className="font-mono">time_limit</code> (segundos)
              y <code className="font-mono">memory_limit</code> (MB) para no tener que completarlos después
            </li>
            <li>
              <code className="font-mono">data/sample/</code> y <code className="font-mono">data/secret/</code> — casos de
              prueba como pares <code className="font-mono">.in</code>/<code className="font-mono">.ans</code>, opcional (se
              pueden subir después); hasta ${PACKAGE_LIMITS.maxTotalBytes / 1024 / 1024} MB en total (una entrada, hasta ${PACKAGE_LIMITS.maxInputBytes / 1024 / 1024} MB), y como máximo ${PACKAGE_LIMITS.maxSampleFiles} archivos de ejemplo (${PACKAGE_LIMITS.maxSampleFiles / 2} casos)
            </li>
            <li><code className="font-mono">problem_statement/problem.en.tex</code> — enunciado, opcional (máx. 2 MB)</li>
            <li><code className="font-mono">solutions/</code> — soluciones de referencia, opcional (máx. 2 MB cada una)</li>
            <li>
              <code className="font-mono">checker.&lt;ext&gt;</code> y <code className="font-mono">validator.&lt;ext&gt;</code> — opcionales
              (máx. 2 MB); a lo sumo uno de cada uno, si hay más de un archivo que coincida se rechaza todo el import
            </li>
          </ul>
          <p>
            Antes de subir, el paquete se revisa aquí y se te dice qué falta o qué se ignoraría.{' '}
            <button type="button" onClick={handleDownloadTemplate} className="text-brand-primary hover:underline font-medium">
              Descargar un paquete de ejemplo
            </button>{' '}
            para partir de la estructura correcta.
          </p>
          <p>
            Extensiones de código soportadas: <code className="font-mono">{PROBLEM_SOURCE_FILE_EXTENSIONS.join(', ')}</code>.
            El ZIP debe contener un único directorio raíz, identificado por incluir <code className="font-mono">problem.yaml</code>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] gap-6">
        {/* Left: Form fields */}
        <div className="space-y-6">
          <FormSection icon={<Info className="h-4 w-4" />} title="Información básica">
            <div className="space-y-4">
              <Input label="Slug" {...register('slug')} error={errors.slug?.message} placeholder="ej: two-sum" />
              <Input label="Título" {...register('title')} error={errors.title?.message} placeholder="Título del problema" />
            </div>
          </FormSection>

          <FormSection icon={<FileText className="h-4 w-4" />} title="Enunciado">
            <Textarea
              label="Contenido (Markdown + LaTeX)"
              {...register('statement')}
              error={errors.statement?.message}
              rows={12}
              placeholder="Escribe el enunciado del problema... Soporta Markdown y $LaTeX$"
              className="font-mono text-sm"
            />
          </FormSection>

          <FormSection icon={<Timer className="h-4 w-4" />} title="Límites de ejecución">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tiempo límite (ms)" type="number" {...register('timeLimit', { valueAsNumber: true })} error={errors.timeLimit?.message} placeholder={String(DEFAULT_PROBLEM_TIME_LIMIT_MS)} />
              <Input label="Memoria límite (MiB)" type="number" {...register('memoryLimit', { valueAsNumber: true })} error={errors.memoryLimit?.message} placeholder={String(DEFAULT_PROBLEM_MEMORY_LIMIT_MB)} />
            </div>
          </FormSection>

          <FormSection icon={<Languages className="h-4 w-4" />} title="Overrides por lenguaje">
            <LanguageOverridesEditor
              value={languageOverrides}
              onChange={(v) => setValue('languageOverrides', v)}
            />
          </FormSection>

          <FormSection icon={<Tags className="h-4 w-4" />} title="Tags">
            <TagPicker
              value={splitTags(tags)}
              onChange={(list) => setValue('tags', list.join(', '))}
              error={errors.tags?.message}
              options={tagsData?.tags ?? []}
              isLoading={isLoadingTags}
            />
          </FormSection>
        </div>

        {/* Right: Live preview */}
        <div className="lg:sticky lg:top-20 lg:h-fit space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                <span className="text-xs font-bold text-neutral-text-muted uppercase tracking-wider">Preview en vivo</span>
              </div>
              <div className="min-h-[200px] max-h-[60vh] overflow-y-auto">
                {statement ? (
                  <MarkdownRenderer content={statement} variant="statement" />
                ) : (
                  <p className="text-sm text-neutral-text-muted italic">El preview del enunciado aparecerá aquí...</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}

// === Edit Form ===

interface EditFormProps {
  problem: ProblemDetail
  onSubmit: (data: UpdateProblemFormData) => void
  isSubmitting: boolean
  onCancel: () => void
}

function EditForm({ problem, onSubmit, isSubmitting, onCancel }: EditFormProps) {
  const { register, handleSubmit, formState: { errors }, setValue, control } = useForm<UpdateProblemFormData>({
    resolver: zodResolver(updateProblemSchema),
    defaultValues: {
      title: problem.title,
      statement: problem.statement || '',
      timeLimit: problem.timeLimit ?? DEFAULT_PROBLEM_TIME_LIMIT_MS,
      memoryLimit: problem.memoryLimit ?? DEFAULT_PROBLEM_MEMORY_LIMIT_MB,
      tags: problem.tags.join(', '),
      accessibility: problem.accessibility,
      languageOverrides: problem.languageOverrides || [],
    },
  })

  const statement = useWatch({ control, name: 'statement' })
  const accessibility = useWatch({ control, name: 'accessibility' })
  const tags = useWatch({ control, name: 'tags' })
  const languageOverrides = useWatch({ control, name: 'languageOverrides' }) || []
  const { data: tagsData, isLoading: isLoadingTags } = useProblemTags()

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-neutral-text-primary">Editar problema</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>Guardar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] gap-6">
        {/* Left: Form fields */}
        <div className="space-y-6">
          <FormSection icon={<Info className="h-4 w-4" />} title="Información básica">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-text-primary mb-1">Slug</label>
                <div className="font-mono text-sm text-neutral-text-muted bg-neutral-surface px-3 py-2 rounded-md">{problem.slug}</div>
                <p className="text-xs text-neutral-text-muted mt-1">El slug no se puede cambiar</p>
              </div>
              <Input label="Título" {...register('title')} error={errors.title?.message} />
            </div>
          </FormSection>

          <FormSection icon={<FileText className="h-4 w-4" />} title="Enunciado">
            <Textarea
              label="Contenido (Markdown + LaTeX)"
              {...register('statement')}
              error={errors.statement?.message}
              rows={12}
              className="font-mono text-sm"
            />
          </FormSection>

          <FormSection icon={<Timer className="h-4 w-4" />} title="Límites de ejecución">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tiempo límite (ms)" type="number" {...register('timeLimit', { valueAsNumber: true })} error={errors.timeLimit?.message} />
              <Input label="Memoria límite (MiB)" type="number" {...register('memoryLimit', { valueAsNumber: true })} error={errors.memoryLimit?.message} />
            </div>
          </FormSection>

          <FormSection icon={<Languages className="h-4 w-4" />} title="Overrides por lenguaje">
            <LanguageOverridesEditor
              value={languageOverrides}
              onChange={(v) => setValue('languageOverrides', v)}
            />
          </FormSection>

          <FormSection icon={<Settings className="h-4 w-4" />} title="Configuración">
            <div className="space-y-4">
              <TagPicker
                value={splitTags(tags)}
                onChange={(list) => setValue('tags', list.join(', '))}
                error={errors.tags?.message}
                options={tagsData?.tags ?? []}
                isLoading={isLoadingTags}
              />
              <div>
                <label className="block text-sm font-medium text-neutral-text-primary mb-1">Accesibilidad</label>
                <Select value={accessibility} onValueChange={(v) => setValue('accessibility', v as 'PUBLIC' | 'PRIVATE')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE">Privado — Solo modificadores pueden agregar a competencias</SelectItem>
                    <SelectItem value="PUBLIC">Público — Cualquier creador de competencias puede usarlo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>
        </div>

        {/* Right: Live preview */}
        <div className="lg:sticky lg:top-20 lg:h-fit space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                <span className="text-xs font-bold text-neutral-text-muted uppercase tracking-wider">Preview en vivo</span>
              </div>
              <div className="min-h-[200px] max-h-[60vh] overflow-y-auto">
                {statement ? (
                  <MarkdownRenderer content={statement} variant="statement" />
                ) : (
                  <p className="text-sm text-neutral-text-muted italic">El preview del enunciado aparecerá aquí...</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
