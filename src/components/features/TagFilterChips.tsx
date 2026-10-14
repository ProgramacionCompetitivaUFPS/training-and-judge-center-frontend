import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagFilterChipsProps {
  tags: readonly string[]
  selectedTag: string | null
  onTagClick: (tag: string) => void
  onClear?: () => void
  limit?: number
}

export function TagFilterChips({ tags, selectedTag, onTagClick, onClear, limit = 8 }: TagFilterChipsProps) {
  const [showAll, setShowAll] = useState(false)
  const visibleTags = showAll ? tags : tags.slice(0, limit)
  const hiddenCount = tags.length - limit

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-neutral-text-muted">Tags:</span>
      {visibleTags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onTagClick(tag)}
          className={cn(
            'px-3 py-1 rounded-pill text-xs font-bold transition-colors',
            selectedTag === tag
              ? 'bg-brand-primary text-neutral-surface'
              : 'bg-neutral-border/50 text-neutral-text-primary hover:bg-neutral-border'
          )}
        >
          {tag}
        </button>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="text-xs font-medium text-neutral-text-muted hover:text-brand-primary transition-colors"
        >
          {showAll ? 'Mostrar menos' : `+${hiddenCount} más`}
        </button>
      )}
      {onClear && selectedTag && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-text-muted hover:text-neutral-text-primary transition-colors"
        >
          <X className="h-3 w-3" />
          Limpiar
        </button>
      )}
    </div>
  )
}
