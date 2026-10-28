import { useState } from 'react'
import { Play, Trash2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { Textarea } from '@/components/ui/Textarea'
import { usePyodide } from '@/hooks/usePyodide'
import { explainPythonError } from '@/lib/pythonErrors'

interface PyodideRunnerProps {
  getCode: () => string
}

export function PyodideRunner({ getCode }: PyodideRunnerProps) {
  const { runCode, isLoading, isRunning, loadError } = usePyodide()
  const [stdin, setStdin] = useState('')
  const [stdout, setStdout] = useState('')
  const [stderr, setStderr] = useState('')

  const handleRun = async () => {
    const code = getCode()
    const result = await runCode(code, stdin)
    setStdout(result.stdout)
    setStderr(result.stderr)
  }

  const explanation = stderr ? explainPythonError(stderr) : null

  const handleClear = () => {
    setStdout('')
    setStderr('')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Probar código</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          label="Entrada (stdin)"
          placeholder="Escribe la entrada aquí..."
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          className="font-mono text-sm min-h-[80px]"
        />

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleRun}
            disabled={isLoading || isRunning}
            isLoading={isRunning}
          >
            {!isRunning && <Play className="h-4 w-4 mr-1" />}
            {isRunning ? 'Ejecutando...' : 'Ejecutar'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-neutral-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Descargando Python runtime...
          </div>
        )}

        {loadError && (
          <p className="text-sm text-status-error">{loadError}</p>
        )}

        {(stdout || stderr) && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-text-primary">Salida</label>
            {stdout && (
              <pre className="rounded-md border border-neutral-border bg-neutral-background p-3 text-sm font-mono whitespace-pre-wrap overflow-auto max-h-[300px]">
                <code>{stdout}</code>
              </pre>
            )}
            {stderr && explanation && (
              <div className="rounded-md border border-status-error/40 bg-status-error/5 p-3 text-sm text-neutral-text-primary space-y-1">
                <p>{explanation}</p>
                <details>
                  <summary className="cursor-pointer text-xs text-neutral-text-muted">Ver el mensaje de Python</summary>
                  <pre className="mt-1 whitespace-pre-wrap overflow-auto max-h-[200px] font-mono text-xs text-status-error">{stderr}</pre>
                </details>
              </div>
            )}
            {stderr && !explanation && (
              <pre className="rounded-md border border-neutral-border bg-neutral-background p-3 text-sm font-mono whitespace-pre-wrap overflow-auto max-h-[300px]">
                <code className="text-status-error">{stderr}</code>
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
