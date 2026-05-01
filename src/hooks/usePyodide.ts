import { useState, useCallback, useRef } from 'react'

interface UsePyodideReturn {
  runCode: (code: string, stdin?: string) => Promise<{ stdout: string; stderr: string }>
  isLoading: boolean
  isRunning: boolean
  loadError: string | null
}

interface PyodideInterface {
  setStdin: (options: { stdin: () => string | undefined }) => void
  setStdout: (options: { batched: (text: string) => void }) => void
  setStderr: (options: { batched: (text: string) => void }) => void
  runPythonAsync: (code: string) => Promise<unknown>
}

declare global {
  interface Window {
    loadPyodide?: () => Promise<PyodideInterface>
  }
}

// Module-level cache shared across components
let pyodideInstance: PyodideInterface | null = null
let pyodideLoading: Promise<PyodideInterface> | null = null

async function getPyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance
  if (pyodideLoading) return pyodideLoading

  pyodideLoading = (async () => {
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Pyodide'))
        document.head.appendChild(script)
      })
    }
    pyodideInstance = await window.loadPyodide!()
    return pyodideInstance
  })()

  return pyodideLoading
}

const EXECUTION_TIMEOUT = 5000

export function usePyodide(): UsePyodideReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const runningRef = useRef(false)

  const runCode = useCallback(async (code: string, stdin?: string): Promise<{ stdout: string; stderr: string }> => {
    if (runningRef.current) {
      return { stdout: '', stderr: 'Ya hay una ejecución en curso' }
    }

    runningRef.current = true
    setIsRunning(true)
    setLoadError(null)

    let pyodide: PyodideInterface

    try {
      setIsLoading(!pyodideInstance)
      pyodide = await getPyodide()
      setIsLoading(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar Pyodide'
      setLoadError(msg)
      setIsLoading(false)
      setIsRunning(false)
      runningRef.current = false
      return { stdout: '', stderr: msg }
    }

    let stdout = ''
    let stderr = ''

    try {
      // Set up stdin
      const stdinLines = (stdin || '').split('\n')
      let stdinIndex = 0
      pyodide.setStdin({
        stdin: () => {
          if (stdinIndex < stdinLines.length) {
            return stdinLines[stdinIndex++]
          }
          return undefined
        },
      })

      // Set up stdout/stderr capture
      pyodide.setStdout({ batched: (text: string) => { stdout += text + '\n' } })
      pyodide.setStderr({ batched: (text: string) => { stderr += text + '\n' } })

      // Patch Blockly-generated code for Pyodide compatibility
      // Blockly generates a text_prompt function that uses raw_input (Python 2)
      // which doesn't exist in Python 3/Pyodide. Replace it with a Python 3 version.
      const patchedCode = code.replace(
        /def text_prompt\(msg\):[\s\S]*?(?=\n\S|\n\n\S|$)/,
        `def text_prompt(msg):\n  try:\n    return input(msg)\n  except EOFError:\n    return ''\n`,
      )

      // Execute with timeout
      const fullCode = patchedCode
      const executionPromise = pyodide.runPythonAsync(fullCode)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo límite excedido')), EXECUTION_TIMEOUT),
      )

      await Promise.race([executionPromise, timeoutPromise])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      stderr += msg + '\n'
    } finally {
      setIsRunning(false)
      runningRef.current = false
    }

    return { stdout: stdout.trimEnd(), stderr: stderr.trimEnd() }
  }, [])

  return { runCode, isLoading, isRunning, loadError }
}
