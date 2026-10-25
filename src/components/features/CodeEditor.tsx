import { useMemo } from 'react'
import CodeMirror, { EditorView, type Extension } from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { java } from '@codemirror/lang-java'
import { python } from '@codemirror/lang-python'
import { codeModeOf, type CodeMode } from '@/lib/constants'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  /** Submission language value (cpp20, java17, python310). */
  language: string
  placeholder?: string
}

const MODE_EXTENSIONS: Record<CodeMode, () => Extension> = { cpp, java, python }

const theme = EditorView.theme({
  '&': { fontSize: '14px', backgroundColor: 'transparent' },
  '.cm-content': { fontFamily: '"JetBrains Mono", ui-monospace, monospace', minHeight: '400px' },
  // #e2e8f0 = neutral.border in tailwind.config.js
  '.cm-gutters': { backgroundColor: 'transparent', borderRight: '1px solid #e2e8f0' },
  '&.cm-focused': { outline: 'none' },
})

/** Source editor with syntax highlighting for the judge's languages. Loaded lazily (CodeMirror is heavy). */
export default function CodeEditor({ value, onChange, language, placeholder }: CodeEditorProps) {
  const extensions = useMemo(() => {
    const exts: Extension[] = [theme, EditorView.lineWrapping]
    const mode = codeModeOf(language)
    if (mode) exts.push(MODE_EXTENSIONS[mode]())
    return exts
  }, [language])

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      placeholder={placeholder}
      indentWithTab
      basicSetup={{ foldGutter: false, highlightActiveLine: true, autocompletion: false }}
      className="rounded-md border border-neutral-border bg-neutral-background overflow-hidden"
      aria-label="Editor de código"
    />
  )
}
