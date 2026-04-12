import React, { Suspense, useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { PROGRAMMING_LANGUAGES } from '@/lib/constants'
import type { BlocklyEditorHandle } from '@/components/features/BlocklyEditor'

const BlocklyEditor = React.lazy(() => import('@/components/features/BlocklyEditor'))

const LANGUAGE_COMPILER_MAP: Record<string, string> = {
  cpp20: 'g++',
  java17: 'javac',
  python310: 'python3',
}

const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  cpp20: ['.cpp', '.cc', '.cxx'],
  java17: ['.java'],
  python310: ['.py'],
}

interface SubmitSolutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  problemSlug: string
  problemTitle: string
  onSubmit: (file: File, language: string, compiler: string) => void
  onBlocklySubmit?: (pythonCode: string, workspaceXml: string, svgBlob: Blob) => void
  isSubmitting: boolean
}

export function SubmitSolutionDialog({
  open,
  onOpenChange,
  problemSlug,
  problemTitle,
  onSubmit,
  onBlocklySubmit,
  isSubmitting,
}: SubmitSolutionDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const blocklyRef = useRef<BlocklyEditorHandle>(null)
  const [language, setLanguage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isBlocklyEmpty, setIsBlocklyEmpty] = useState(true)

  const isBlockly = language === 'blockly'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)

    // Auto-detect language from extension
    if (!language) {
      const ext = '.' + selected.name.split('.').pop()?.toLowerCase()
      for (const [lang, exts] of Object.entries(LANGUAGE_EXTENSIONS)) {
        if (exts.includes(ext)) {
          setLanguage(lang)
          break
        }
      }
    }
  }

  const handleSubmit = () => {
    if (isBlockly) {
      const editor = blocklyRef.current
      if (!editor) return

      const pythonCode = editor.getCode()
      const workspaceXml = editor.getXml()
      const svgBlob = editor.getSvg()

      if (onBlocklySubmit) {
        onBlocklySubmit(pythonCode, workspaceXml, svgBlob)
      } else {
        // Fallback: create a File from the Python code
        const pyFile = new File([pythonCode], 'solution.py', { type: 'text/x-python' })
        onSubmit(pyFile, 'Blockly', 'python3')
      }
      return
    }

    if (!file || !language) return
    const compiler = LANGUAGE_COMPILER_MAP[language] || language
    onSubmit(file, language, compiler)
  }

  const handleClose = () => {
    setLanguage('')
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar solución</DialogTitle>
          <DialogDescription>
            {problemTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Language selector */}
          <div>
            <label className="block text-sm font-medium text-neutral-text-primary mb-2">Lenguaje</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar lenguaje" />
              </SelectTrigger>
              <SelectContent>
                {PROGRAMMING_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File upload / Blockly editor */}
          {isBlockly ? (
            <div>
              <label className="block text-sm font-medium text-neutral-text-primary mb-2">Editor de bloques</label>
              <Suspense fallback={
                <div className="border border-neutral-border rounded-lg p-6 text-center" style={{ minHeight: 320 }}>
                  <p className="text-neutral-text-muted">Cargando editor de bloques...</p>
                </div>
              }>
                <BlocklyEditor
                  ref={blocklyRef}
                  problemSlug={problemSlug}
                  onEmptyChange={setIsBlocklyEmpty}
                />
              </Suspense>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-neutral-text-primary mb-2">Archivo de código</label>
              <div
                className="border-2 border-dashed border-neutral-border rounded-lg p-6 text-center cursor-pointer hover:border-brand-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".cpp,.cc,.cxx,.java,.py"
                  onChange={handleFileChange}
                />
                {file ? (
                  <div>
                    <p className="font-medium text-neutral-text">{file.name}</p>
                    <p className="text-xs text-neutral-text-muted mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-neutral-text-muted mx-auto mb-2" />
                    <p className="text-sm text-neutral-text-muted">Click para seleccionar archivo</p>
                    <p className="text-xs text-neutral-text-muted mt-1">.cpp, .java, .py</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isBlockly ? (!language || isBlocklyEmpty || isSubmitting) : (!file || !language || isSubmitting)}
            isLoading={isSubmitting}
          >
            Enviar solución
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
