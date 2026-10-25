import { useMemo } from 'react'
import CodeMirror, { EditorView, Prec, keymap, type Extension } from '@uiw/react-codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { java } from '@codemirror/lang-java'
import { python } from '@codemirror/lang-python'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  /** Submission language value (cpp20, java17, python310). */
  language: string
  /** Called on Ctrl/Cmd+Enter. */
  onSubmit?: () => void
  placeholder?: string
}

const LANGUAGE_EXTENSIONS: Record<string, () => Extension> = {
  cpp20: cpp,
  java17: java,
  python310: python,
}

const theme = EditorView.theme({
  '&': { fontSize: '14px', backgroundColor: 'transparent' },
  '.cm-content': { fontFamily: '"JetBrains Mono", ui-monospace, monospace', minHeight: '400px' },
  // #e2e8f0 = neutral.border in tailwind.config.js
  '.cm-gutters': { backgroundColor: 'transparent', borderRight: '1px solid #e2e8f0' },
  '&.cm-focused': { outline: 'none' },
})

/**
 * Code editor for the submit page (CodeMirror 6): highlighting for the judge's languages, line
 * numbers, auto-indent, bracket closing and Tab indenting. Loaded lazily by the submit page so
 * the rest of the app doesn't pay for it.
 */
export default function CodeEditor({ value, onChange, language, onSubmit, placeholder }: CodeEditorProps) {
  const extensions = useMemo(() => {
    const exts: Extension[] = [theme, EditorView.lineWrapping]
    const lang = LANGUAGE_EXTENSIONS[language]
    if (lang) exts.push(lang())
    if (onSubmit) {
      // Highest precedence: the default keymap already binds Mod-Enter to insertBlankLine.
      exts.push(Prec.highest(keymap.of([{ key: 'Mod-Enter', preventDefault: true, run: () => { onSubmit(); return true } }])))
    }
    return exts
  }, [language, onSubmit])

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
