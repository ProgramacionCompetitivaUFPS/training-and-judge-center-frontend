import { Badge } from '@/components/ui/Badge'
import { Pin, User, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Material } from '@/types/material'

interface MaterialListItemProps {
  material: Material
  onClick: () => void
  showPreview?: boolean
}

export function MaterialListItem({ material, onClick, showPreview = false }: MaterialListItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 py-4 px-5 cursor-pointer hover:bg-neutral-surface-hover transition-colors',
        material.pinned && 'bg-brand-primary-muted'
      )}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {material.pinned && <Pin className="h-4 w-4 text-brand-primary shrink-0" />}
          <span className="font-medium truncate">{material.title}</span>
          {material.status === 'DRAFT' && <Badge variant="default">Borrador</Badge>}
        </div>
        {showPreview && (
          <p className="text-sm text-neutral-text-muted line-clamp-1 mt-0.5">
            {material.content.replace(/[#*`[\]]/g, '').slice(0, 150)}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-neutral-text-muted">
            <User className="h-3 w-3" />
            @{material.author.nickname}
          </span>
          {material.publishedAt && (
            <span className="flex items-center gap-1 text-xs text-neutral-text-muted">
              <Calendar className="h-3 w-3" />
              {new Date(material.publishedAt).toLocaleDateString('es')}
            </span>
          )}
          {material.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {material.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="default" className="text-[10px]">{tag}</Badge>
              ))}
              {material.tags.length > 3 && (
                <span className="text-[10px] text-neutral-text-muted font-medium">+{material.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
