import { Badge } from '@/components/ui/Badge'
import { Pin, User, Calendar } from 'lucide-react'
import type { Material } from '@/types/material'

interface MaterialListItemProps {
  material: Material
  onClick: () => void
  showPreview?: boolean
}

export function MaterialListItem({ material, onClick, showPreview = false }: MaterialListItemProps) {
  return (
    <div
      className="flex items-center gap-4 py-4 px-5 cursor-pointer hover:bg-neutral-surface-hover transition-colors"
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
        <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-text-muted truncate">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            @{material.author.nickname}
          </span>
          {material.publishedAt && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(material.publishedAt).toLocaleDateString()}
              </span>
            </>
          )}
          {material.tags.length > 0 && (
            <>
              <span>·</span>
              <span className="truncate">{material.tags.join(' · ')}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
