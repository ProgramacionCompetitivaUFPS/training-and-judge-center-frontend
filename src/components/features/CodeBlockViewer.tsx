import { useMemo } from 'react'
import CodeMirror, { EditorView, type Extension } from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { java } from '@codemirror/lang-java'
import { python } from '@codemirror/lang-python'
import type { CodeMode } from '@/lib/constants'

interface CodeBlockViewerProps {
  value: string
  /** Syntax to highlight; none for plain text such as a test case. */
  mode?: CodeMode
  /** Soft-wrap long lines. Off by default: a test input is often one very long line. */
  wrap?: boolean
  /** CSS height of the viewer; it scrolls inside. */
  height?: string
  ariaLabel: string
}

const MODE_EXTENSIONS: Record<CodeMode, () => Extension> = { cpp, java, python }

const theme = EditorView.theme({
  '&': { fontSize: '13px', backgroundColor: 'transparent' },
  '.cm-content': { fontFamily: '"JetBrains Mono", ui-monospace, monospace' },
  // #e2e8f0 = neutral.border in tailwind.config.js
  '.cm-gutters': { backgroundColor: 'transparent', borderRight: '1px solid #e2e8f0' },
  '&.cm-focused': { outline: 'none' },
})

/**
 * Read-only view of a whole file. CodeMirror only draws the lines on screen, so a file with
 * hundreds of thousands of lines scrolls as smoothly as a short one, which the plain viewer used
 * for previews (CodeViewer) can't do. It also brings search (Ctrl+F) for free. Loaded lazily:
 * CodeMirror is heavy and only the full-file pages need it.
 */
export default function CodeBlockViewer({ value, mode, wrap = false, height = '70vh', ariaLabel }: CodeBlockViewerProps) {
  const extensions = useMemo(() => {
    const exts: Extension[] = [
      theme,
      // Keeps the caret, selection and search working but stops a phone from raising its keyboard.
      EditorView.contentAttributes.of({ inputmode: 'none' }),
    ]
    if (wrap) exts.push(EditorView.lineWrapping)
    if (mode) exts.push(MODE_EXTENSIONS[mode]())
    return exts
  }, [mode, wrap])

  return (
    <CodeMirror
      value={value}
      readOnly
      height={height}
      extensions={extensions}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        autocompletion: false,
        closeBrackets: false,
        indentOnInput: false,
        dropCursor: false,
        rectangularSelection: false,
        crosshairCursor: false,
      }}
      className="rounded-md border border-neutral-border bg-neutral-background overflow-hidden"
      aria-label={ariaLabel}
    />
  )
}
