import { useEffect, useMemo, useRef, useState } from 'react'
import hljs from 'highlight.js/lib/core'
import cpp from 'highlight.js/lib/languages/cpp'
import java from 'highlight.js/lib/languages/java'
import python from 'highlight.js/lib/languages/python'
import 'highlight.js/styles/stackoverflow-light.css'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { codeModeOf } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Only the judge's languages, so the bundle doesn't pull every grammar highlight.js ships.
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('java', java)
hljs.registerLanguage('python', python)

// Highlighting runs synchronously on render; past this size it would freeze the page, so the
// source is shown as plain text instead.
const MAX_HIGHLIGHT_CHARS = 200_000

// What it costs to draw depends on the number of lines far more than on the bytes: a few hundred
// thousand near-empty lines froze the tab for over a minute. Past this only the start is drawn;
// "Copiar" still copies the whole source.
const MAX_RENDERED_LINES = 5_000

function limitLines(code: string): { shown: string; totalLines: number; cut: boolean } {
  let newlines = 0
  let cutAt = -1
  for (let i = 0; i < code.length; i++) {
    if (code.charCodeAt(i) === 10) {
      newlines++
      if (newlines === MAX_RENDERED_LINES) cutAt = i
    }
  }
  // A trailing newline ends the last line, it doesn't start another one.
  const totalLines = newlines + (code.endsWith('\n') ? 0 : 1)
  return totalLines > MAX_RENDERED_LINES
    ? { shown: code.slice(0, cutAt), totalLines, cut: true }
    : { shown: code, totalLines, cut: false }
}

interface CodeViewerProps {
  code: string
  /** Submission language value (cpp20, java17, python310, blockly). */
  language: string
  className?: string
}

/** Read-only source code with syntax highlighting, line numbers and a copy button. */
export function CodeViewer({ code, language, className }: CodeViewerProps) {
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>()
  const mode = codeModeOf(language)

  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  const { shown, totalLines, cut } = useMemo(() => limitLines(code), [code])

  // highlight.js escapes the source, so its HTML output is safe to inject.
  const html = useMemo(
    () =>
      mode && shown.length <= MAX_HIGHLIGHT_CHARS
        ? hljs.highlight(shown, { language: mode, ignoreIllegals: true }).value
        : null,
    [shown, mode],
  )
  const lineNumbers = useMemo(
    () => Array.from({ length: cut ? MAX_RENDERED_LINES : totalLines }, (_, i) => i + 1).join('\n'),
    [cut, totalLines],
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be unavailable (non-secure context, denied permission): nothing to undo.
    }
  }

  return (
    <div className={cn('relative rounded-lg bg-neutral-surface', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 gap-1.5 bg-white/90"
        aria-label="Copiar código"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
      <div className="flex overflow-x-auto text-sm font-mono leading-relaxed">
        <pre
          aria-hidden="true"
          className="select-none shrink-0 py-4 pl-4 pr-3 text-right text-neutral-text-muted/70 border-r border-neutral-border"
        >
          {lineNumbers}
        </pre>
        <pre className="flex-1 py-4 pl-4 pr-24 text-neutral-text-primary">
          {html !== null ? (
            <code className="hljs !bg-transparent !p-0" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <code>{shown}</code>
          )}
        </pre>
      </div>
      {cut && (
        <p className="border-t border-neutral-border px-4 py-2 text-xs text-status-warning">
          Se muestran solo las primeras {MAX_RENDERED_LINES.toLocaleString('es')} de {totalLines.toLocaleString('es')} líneas.
          «Copiar» copia el código completo.
        </p>
      )}
    </div>
  )
}
