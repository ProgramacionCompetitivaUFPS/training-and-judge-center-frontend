import { useState, useCallback, useRef } from 'react'

interface UsePyodideReturn {
  runCode: (code: string, stdin?: string) => Promise<{ stdout: string; stderr: string }>
  isLoading: boolean
  isRunning: boolean
  loadError: string | null
}

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'loadError'; message: string }
  | { type: 'result'; stdout: string; stderr: string }
  | { type: 'execError'; message: string; stdout: string; stderr: string }

// 30s to download Pyodide from CDN; 5s for actual Python code execution
const LOAD_TIMEOUT = 30_000
const EXECUTION_TIMEOUT = 5_000

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
    setIsLoading(true)
    setLoadError(null)

    let worker: Worker

    try {
      worker = new Worker(new URL('../workers/pyodide.worker.ts', import.meta.url))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo crear el worker de ejecución'
      setLoadError(msg)
      setIsLoading(false)
      setIsRunning(false)
      runningRef.current = false
      return { stdout: '', stderr: msg }
    }

    try {
      const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        let loadTimeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
          worker.terminate()
          reject(new Error('Tiempo límite de carga excedido'))
        }, LOAD_TIMEOUT)

        let execTimeoutId: ReturnType<typeof setTimeout> | null = null

        worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
          const msg = e.data
          if (msg.type === 'ready') {
            clearTimeout(loadTimeoutId!)
            loadTimeoutId = null
            setIsLoading(false)
            execTimeoutId = setTimeout(() => {
              worker.terminate()
              reject(new Error('Tiempo límite excedido'))
            }, EXECUTION_TIMEOUT)
          } else if (msg.type === 'loadError') {
            clearTimeout(loadTimeoutId!)
            loadTimeoutId = null
            setIsLoading(false)
            setLoadError(msg.message)
            reject(new Error(msg.message))
          } else if (msg.type === 'result') {
            if (execTimeoutId !== null) {
              clearTimeout(execTimeoutId)
              execTimeoutId = null
            }
            resolve({ stdout: msg.stdout, stderr: msg.stderr })
          } else if (msg.type === 'execError') {
            if (execTimeoutId !== null) {
              clearTimeout(execTimeoutId)
              execTimeoutId = null
            }
            resolve({ stdout: msg.stdout, stderr: msg.message })
          }
        }

        worker.onerror = (e) => {
          if (loadTimeoutId !== null) {
            clearTimeout(loadTimeoutId)
            loadTimeoutId = null
          }
          if (execTimeoutId !== null) {
            clearTimeout(execTimeoutId)
            execTimeoutId = null
          }
          setIsLoading(false)
          const errMsg = e.message || 'Error en el worker de ejecución'
          setLoadError(errMsg)
          reject(new Error(errMsg))
        }

        worker.postMessage({ code, stdin })
      })

      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { stdout: '', stderr: msg }
    } finally {
      worker.terminate()
      setIsRunning(false)
      setIsLoading(false)
      runningRef.current = false
    }
  }, [])

  return { runCode, isLoading, isRunning, loadError }
}
