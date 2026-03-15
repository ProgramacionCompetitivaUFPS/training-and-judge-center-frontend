import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '@/components/ui'
import { Textarea } from '@/components/ui'
import { Play, RotateCcw } from 'lucide-react'
import { PROGRAMMING_LANGUAGES } from '@/lib/constants'

interface CodeEditorProps {
  onSubmit?: (code: string, language: string) => void
  onRun?: (code: string, language: string) => void
}

export function CodeEditor({ onSubmit, onRun }: CodeEditorProps) {
  const [code, setCode] = useState(`// Escribe tu código aquí
function solution() {
  // Tu solución
}`)
  const [language, setLanguage] = useState('cpp')

  const handleReset = () => {
    setCode(`// Escribe tu código aquí
function solution() {
  // Tu solución
}`)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Editor de Código</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROGRAMMING_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="font-mono text-sm min-h-[400px] resize-none"
          placeholder="Escribe tu código aquí..."
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onRun?.(code, language)}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Ejecutar
          </Button>
          <Button
            variant="primary"
            onClick={() => onSubmit?.(code, language)}
          >
            Enviar Solución
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
