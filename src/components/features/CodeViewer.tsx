import { useMemo, useState } from 'react'
import hljs from 'highlight.js/lib/core'
import cpp from 'highlight.js/lib/languages/cpp'
import java from 'highlight.js/lib/languages/java'
import python from 'highlight.js/lib/languages/python'
import 'highlight.js/styles/stackoverflow-light.css'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// Only the judge's languages, so the bundle doesn't pull every grammar highlight.js ships.
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('java', java)
hljs.registerLanguage('python', python)

// Submission language → highlight.js grammar (Blockly submissions are generated Python).
const GRAMMAR: Record<string, string> = {
  cpp20: 'cpp',
  java17: 'java',
  python310: 'python',
  blockly: 'python',
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
  const grammar = GRAMMAR[language]

  // highlight.js escapes the source, so its HTML output is safe to inject.
  const html = useMemo(
    () => (grammar ? hljs.highlight(code, { language: grammar, ignoreIllegals: true }).value : null),
    [code, grammar],
  )
  const lineCount = useMemo(() => code.replace(/\n$/, '').split('\n').length, [code])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
        <div
          aria-hidden="true"
          className="select-none shrink-0 py-4 pl-4 pr-3 text-right text-neutral-text-muted/70 border-r border-neutral-border"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="flex-1 py-4 pl-4 pr-24 text-neutral-text-primary">
          {html !== null ? (
            <code className="hljs !bg-transparent !p-0" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <code>{code}</code>
          )}
        </pre>
      </div>
    </div>
  )
}
