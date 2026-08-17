import { useState, type ReactNode } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Input } from './Input'
import { cn } from '@/lib/utils'

interface SearchSelectProps<T> {
  query: string
  onQueryChange: (value: string) => void
  results: T[]
  isSearching?: boolean
  minChars?: number
  placeholder?: string
  emptyLabel?: string
  hintLabel?: string
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  onSelect: (item: T) => void
  className?: string
}

/** A text input with a debounced-results dropdown underneath. The caller owns debouncing the
 * query and fetching `results` — this component only handles the open/close/selection UI. */
export function SearchSelect<T>({
  query,
  onQueryChange,
  results,
  isSearching = false,
  minChars = 2,
  placeholder,
  emptyLabel = 'Sin resultados',
  hintLabel,
  getKey,
  renderItem,
  onSelect,
  className,
}: SearchSelectProps<T>) {
  const [isFocused, setIsFocused] = useState(false)
  const showDropdown = isFocused && query.trim().length >= minChars

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-text-muted" />
        <Input
          placeholder={placeholder}
          className="pl-9"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-neutral-border bg-neutral-surface shadow-elevation-2">
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-neutral-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <p className="py-4 text-center text-sm text-neutral-text-muted">{emptyLabel}</p>
          ) : (
            <ul>
              {results.map((item) => (
                <li key={getKey(item)}>
                  <button
                    type="button"
                    // Fires before the input's onBlur closes the dropdown.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSelect(item)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-background transition-colors"
                  >
                    {renderItem(item)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {isFocused && query.trim().length > 0 && query.trim().length < minChars && hintLabel && (
        <p className="absolute z-50 mt-1 w-full rounded-md border border-neutral-border bg-neutral-surface shadow-elevation-2 px-3 py-2 text-xs text-neutral-text-muted">
          {hintLabel}
        </p>
      )}
    </div>
  )
}
