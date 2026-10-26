import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

interface TagPickerProps {
  value: string[]
  onChange: (tags: string[]) => void
  /** The closed vocabulary the backend accepts; any other tag is rejected there. */
  options: string[]
  /** Error coming from the form itself (the schema, or the backend's answer). */
  error?: string
  isLoading?: boolean
}

/**
 * Picks tags from the platform's closed vocabulary. The whole list is available (it opens on
 * focus), it narrows as you type, works with the keyboard, and says so when what you typed is
 * not a tag — before, an unknown tag was silently ignored and only the first few suggestions
 * were ever shown.
 */
export function TagPicker({ value, onChange, options, error, isLoading = false }: TagPickerProps) {
  const listId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [typedError, setTypedError] = useState<string | null>(null)

  const normalized = query.trim().toLowerCase()
  const matches = useMemo(() => {
    const free = options.filter((o) => !value.includes(o) && o.includes(normalized))
    // What starts with the text first: "dp" before "bitmask-dp"
    return [...free].sort((a, b) => Number(b.startsWith(normalized)) - Number(a.startsWith(normalized)) || a.localeCompare(b))
  }, [options, value, normalized])

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  function add(tag: string) {
    if (value.includes(tag)) return
    onChange([...value, tag])
    setQuery('')
    setActive(0)
    setTypedError(null)
  }

  function submitTyped() {
    if (!normalized) return
    if (value.includes(normalized)) {
      setTypedError(`«${normalized}» ya está agregado.`)
    } else if (options.includes(normalized)) {
      add(normalized)
    } else if (matches[active]) {
      add(matches[active])
    } else {
      setTypedError(`«${normalized}» no es un tag válido. Elige uno de la lista.`)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault() // never submit the whole form from here
      if (open && !normalized && matches[active]) add(matches[active])
      else submitTyped()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const shownError = typedError ?? error

  return (
    <div className="space-y-3" ref={containerRef}>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Tags elegidos">
          {value.map((tag) => (
            <li key={tag}>
              <Badge variant="primary" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((t) => t !== tag))}
                  className="ml-1 p-0.5 rounded-full hover:bg-white/20 transition-colors"
                  aria-label={`Quitar el tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
          aria-invalid={shownError ? true : undefined}
          aria-label="Agregar un tag"
          autoComplete="off"
          placeholder={isLoading ? 'Cargando tags…' : 'Escribe para filtrar o elige de la lista…'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setTypedError(null)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            'h-10 w-full rounded-md border-2 bg-neutral-surface px-3 text-sm text-neutral-text-primary placeholder:text-neutral-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary',
            shownError ? 'border-status-error' : 'border-neutral-border',
          )}
        />

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Tags disponibles"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-neutral-border bg-neutral-surface p-1 shadow-elevation-2"
          >
            {matches.map((tag, i) => (
              <li
                key={tag}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: the input must keep focus or the list would close first
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(tag)
                }}
                onMouseEnter={() => setActive(i)}
                className={cn('cursor-pointer rounded-sm px-2 py-1.5 text-sm', i === active ? 'bg-brand-primary-muted text-brand-primary' : 'text-neutral-text-primary')}
              >
                {tag}
              </li>
            ))}
            {matches.length === 0 && (
              <li role="presentation" className="px-2 py-1.5 text-sm text-neutral-text-muted">
                {isLoading
                  ? 'Cargando tags…'
                  : normalized
                    ? `Ningún tag coincide con «${normalized}».`
                    : 'Ya elegiste todos los tags disponibles.'}
              </li>
            )}
          </ul>
        )}
      </div>

      {shownError ? (
        <p className="text-xs text-status-error" role="alert">{shownError}</p>
      ) : (
        <p className="text-xs text-neutral-text-muted">
          Solo se admiten los {options.length || '…'} tags de la lista. Opcionales.
        </p>
      )}
    </div>
  )
}
