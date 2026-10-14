import { useCallback, useMemo } from 'react'

interface UseBlocklyPersistenceReturn {
  save(xml: string): void
  load(): string | null
  clear(): void
}

function getStorageKey(problemSlug: string): string {
  return `blockly-workspace-${problemSlug}`
}

function isValidXml(xml: string): boolean {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    return !doc.querySelector('parsererror')
  } catch {
    return false
  }
}

export function useBlocklyPersistence(problemSlug: string): UseBlocklyPersistenceReturn {
  const key = useMemo(() => getStorageKey(problemSlug), [problemSlug])

  const save = useCallback(
    (xml: string) => {
      try {
        sessionStorage.setItem(key, xml)
      } catch {
        console.warn('Blockly: no se pudo guardar en sessionStorage')
      }
    },
    [key],
  )

  const load = useCallback((): string | null => {
    try {
      const stored = sessionStorage.getItem(key)
      if (stored === null) return null

      if (!isValidXml(stored)) {
        console.warn('Blockly: XML corrupto descartado para problema:', problemSlug)
        sessionStorage.removeItem(key)
        return null
      }

      return stored
    } catch {
      return null
    }
  }, [key, problemSlug])

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(key)
    } catch {
      // silently ignore
    }
  }, [key])

  return { save, load, clear }
}
