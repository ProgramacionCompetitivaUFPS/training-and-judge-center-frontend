import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/Dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/Dropdown'
import { MarkdownRenderer } from '@/components/features/MarkdownRenderer'
import {
  useMaterialDetail, useDeleteMaterial, usePublishMaterial,
  useUnpublishMaterial, usePinMaterial, useUnpinMaterial,
} from '@/hooks/api/useMaterials'
import { useGroupDetail } from '@/hooks/api/useGroups'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/hooks/useToastContext'
import {
  BookOpen, Edit, Trash2, MoreVertical, Pin, Loader2,
  User, Calendar,
} from 'lucide-react'
import { isNotFoundError } from '@/lib/errors'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import { getErrorMessage } from '@/lib/errorMessages'

export function MaterialDetailPage() {
  const { groupId, materialId } = useParams<{ groupId: string; materialId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToastContext()

  const { data: material, isLoading, error } = useMaterialDetail(groupId!, materialId!)
  const { data: groupDetail } = useGroupDetail(groupId!)
  const deleteMutation = useDeleteMaterial()
  const publishMutation = usePublishMaterial()
  const unpublishMutation = useUnpublishMaterial()
  const pinMutation = usePinMaterial()
  const unpinMutation = useUnpinMaterial()

  const [deleteOpen, setDeleteOpen] = useState(false)

  const isAdmin = user?.role === 'ADMIN'
  const isAuthor = material?.author.nickname === user?.nickname
  const isRealLead = groupDetail?.userMembership.role === 'LEAD'
  const canEdit = isAdmin || isAuthor
  // Matches PinMaterialUseCase: allowed for the real leader of this group, or the material's author.
  const canPin = isAdmin || isRealLead || isAuthor
  const canSeeStatus = isAdmin || user?.role === 'COACH'

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ groupId: groupId!, materialId: materialId! })
      toast({ variant: 'success', title: 'Material eliminado' })
      navigate(`/groups/${groupId}/materials`)
    } catch (err) {
      toast({ variant: 'error', title: 'Error al eliminar material', description: getErrorMessage(err) })
    }
    setDeleteOpen(false)
  }

  const handlePublish = async () => {
    try {
      await publishMutation.mutateAsync({ groupId: groupId!, materialId: materialId! })
      toast({ variant: 'success', title: 'Material publicado' })
    } catch (err) {
      toast({ variant: 'error', title: 'Error al publicar', description: getErrorMessage(err) })
    }
  }

  const handleUnpublish = async () => {
    try {
      await unpublishMutation.mutateAsync({ groupId: groupId!, materialId: materialId! })
      toast({ variant: 'success', title: 'Material despublicado' })
    } catch (err) {
      toast({ variant: 'error', title: 'Error al despublicar', description: getErrorMessage(err) })
    }
  }

  const handleTogglePin = async () => {
    try {
      if (material?.pinned) {
        await unpinMutation.mutateAsync({ groupId: groupId!, materialId: materialId! })
        toast({ variant: 'success', title: 'Material desfijado' })
      } else {
        await pinMutation.mutateAsync({ groupId: groupId!, materialId: materialId! })
        toast({ variant: 'success', title: 'Material fijado' })
      }
    } catch (err) {
      toast({ variant: 'error', title: 'Error al cambiar fijado', description: getErrorMessage(err) })
    }
  }

  const breadcrumbs = [
    { label: 'Grupos', href: '/groups' },
    { label: groupDetail?.name ?? 'Grupo', href: `/groups/${groupId}` },
    { label: 'Materiales', href: `/groups/${groupId}/materials` },
    { label: material?.title ?? 'Cargando...' },
  ]

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        </div>
      </AppLayout>
    )
  }

  if (isNotFoundError(error)) return <NotFoundPage />
  if (!material) return null

  return (
    <>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main content — left column */}
            <div className="lg:col-span-8 space-y-6">
              {/* Article header */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <h1 className="text-3xl font-extrabold text-neutral-text-primary leading-tight flex items-center gap-3">
                      {material.title}
                      {canSeeStatus && (
                        <Badge variant={material.status === 'DRAFT' ? 'warning' : 'success'}>
                          {material.status === 'DRAFT' ? 'Borrador' : 'Publicado'}
                        </Badge>
                      )}
                      {material.pinned && (
                        <Badge variant="primary" className="flex items-center gap-1">
                          <Pin className="h-3 w-3" />
                          Fijado
                        </Badge>
                      )}
                    </h1>
                  </div>
                  {(canEdit || canPin) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="shrink-0" aria-label="Acciones del material">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem onClick={() => navigate(`/groups/${groupId}/materials/${materialId}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canEdit && material.status === 'DRAFT' && (
                          <DropdownMenuItem onClick={handlePublish}>Publicar</DropdownMenuItem>
                        )}
                        {canEdit && material.status === 'PUBLISHED' && (
                          <DropdownMenuItem onClick={handleUnpublish}>Despublicar</DropdownMenuItem>
                        )}
                        {canPin && material.status === 'PUBLISHED' && (
                          <DropdownMenuItem onClick={handleTogglePin}>
                            <Pin className="mr-2 h-4 w-4" />
                            {material.pinned ? 'Desfijar' : 'Fijar'}
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-status-error">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* A draft is invisible to members; make that and the way out obvious instead of
                    leaving "Publicar" inside the ⋮ menu. */}
                {canEdit && material.status === 'DRAFT' && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-status-warning/30 bg-status-warning/10 px-4 py-3">
                    <p className="text-sm text-neutral-text-primary">
                      Este material es un <span className="font-semibold">borrador</span>: solo los líderes del grupo lo ven.
                    </p>
                    <Button size="sm" onClick={handlePublish} isLoading={publishMutation.isPending} className="shrink-0">
                      Publicar
                    </Button>
                  </div>
                )}

                {/* Author line */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-brand-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-text-primary">
                      {material.author.name}
                    </p>
                    <p className="text-xs text-neutral-text-muted">
                      @{material.author.nickname} · {new Date(material.publishedAt ?? material.createdAt).toLocaleDateString('es')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content card */}
              <Card className="overflow-hidden">
                <CardContent className="p-8 lg:p-10">
                  <MarkdownRenderer content={material.content} />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar — right column */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Info card */}
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h3 className="text-xs font-bold text-neutral-text-muted uppercase tracking-widest">
                    Información
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-1.5 border-b border-neutral-border">
                      <span className="text-sm text-neutral-text-muted flex items-center gap-2">
                        <User className="h-3.5 w-3.5" /> Autor
                      </span>
                      <span className="text-sm font-medium">@{material.author.nickname}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-neutral-border">
                      <span className="text-sm text-neutral-text-muted flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" /> Creado
                      </span>
                      <span className="text-sm font-medium">{new Date(material.createdAt).toLocaleDateString('es')}</span>
                    </div>
                    {material.publishedAt && (
                      <div className="flex items-center justify-between py-1.5 border-b border-neutral-border">
                        <span className="text-sm text-neutral-text-muted flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" /> Publicado
                        </span>
                        <span className="text-sm font-medium">{new Date(material.publishedAt).toLocaleDateString('es')}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-neutral-text-muted flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5" /> Grupo
                      </span>
                      <button
                        onClick={() => navigate(`/groups/${groupId}`)}
                        className="text-sm font-medium text-brand-primary hover:underline"
                      >
                        {groupDetail?.name ?? 'Grupo'}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tags card */}
              {material.tags.length > 0 && (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-xs font-bold text-neutral-text-muted uppercase tracking-widest">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {material.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </AppLayout>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar material</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este material? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={deleteMutation.isPending}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
