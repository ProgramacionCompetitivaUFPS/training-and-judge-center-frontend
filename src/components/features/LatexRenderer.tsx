import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface LatexRendererProps {
  content: string
  className?: string
}

/**
 * Renderiza texto con fragmentos LaTeX.
 * - `$$...$$` → bloque (display math)
 * - `$...$` → inline math
 * - Texto fuera de delimitadores se renderiza como HTML normal.
 */
export function LatexRenderer({ content, className }: LatexRendererProps) {
  const html = useMemo(() => renderLatex(content), [content])

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function renderLatex(text: string): string {
  // Split by $$...$$ (display) and $...$ (inline), preserving delimiters
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g)

  return parts
    .map((part) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const tex = part.slice(2, -2).trim()
        try {
          return katex.renderToString(tex, { displayMode: true, throwOnError: false })
        } catch {
          return `<code>${tex}</code>`
        }
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        const tex = part.slice(1, -1).trim()
        try {
          return katex.renderToString(tex, { displayMode: false, throwOnError: false })
        } catch {
          return `<code>${tex}</code>`
        }
      }
      // Plain text: escape HTML and convert newlines to <br>
      return escapeHtml(part).replace(/\n/g, '<br />')
    })
    .join('')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
