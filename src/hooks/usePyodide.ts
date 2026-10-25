import { useState, useCallback, useRef, useEffect } from 'react'

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
  const workerRef = useRef<Worker | null>(null)
  const pyodideReadyRef = useRef(false)

  const terminateWorker = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    pyodideReadyRef.current = false
  }, [])

  // Clean up on component unmount
  useEffect(() => terminateWorker, [terminateWorker])

  const runCode = useCallback(async (code: string, stdin?: string): Promise<{ stdout: string; stderr: string }> => {
    if (runningRef.current) {
      return { stdout: '', stderr: 'Ya hay una ejecución en curso' }
    }

    runningRef.current = true
    setIsRunning(true)
    setLoadError(null)

    // Reuse the existing worker if Pyodide is already loaded; otherwise create a fresh one.
    const isWarm = pyodideReadyRef.current && workerRef.current !== null
    if (!isWarm) {
      terminateWorker()
      try {
        workerRef.current = new Worker(new URL('../workers/pyodide.worker.ts', import.meta.url))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo crear el worker de ejecución'
        setLoadError(msg)
        setIsRunning(false)
        runningRef.current = false
        return { stdout: '', stderr: msg }
      }
      setIsLoading(true)
    }

    const worker = workerRef.current!

    try {
      const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        let loadTimeoutId: ReturnType<typeof setTimeout> | null = null
        let execTimeoutId: ReturnType<typeof setTimeout> | null = null

        const startExecTimeout = () => {
          execTimeoutId = setTimeout(() => {
            terminateWorker()
            reject(new Error('Tiempo límite excedido'))
          }, EXECUTION_TIMEOUT)
        }

        if (!isWarm) {
          loadTimeoutId = setTimeout(() => {
            terminateWorker()
            reject(new Error('Tiempo límite de carga excedido'))
          }, LOAD_TIMEOUT)
        }

        worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
          const msg = e.data

          if (msg.type === 'ready') {
            pyodideReadyRef.current = true
            if (loadTimeoutId !== null) { clearTimeout(loadTimeoutId); loadTimeoutId = null }
            setIsLoading(false)
            startExecTimeout()
            worker.postMessage({ code, stdin })
          } else if (msg.type === 'loadError') {
            if (loadTimeoutId !== null) { clearTimeout(loadTimeoutId); loadTimeoutId = null }
            setIsLoading(false)
            setLoadError(msg.message)
            terminateWorker()
            reject(new Error(msg.message))
          } else if (msg.type === 'result') {
            if (execTimeoutId !== null) { clearTimeout(execTimeoutId); execTimeoutId = null }
            resolve({ stdout: msg.stdout, stderr: msg.stderr })
          } else if (msg.type === 'execError') {
            if (execTimeoutId !== null) { clearTimeout(execTimeoutId); execTimeoutId = null }
            // Execution error — terminate so the next run starts with a clean Python state
            terminateWorker()
            resolve({ stdout: msg.stdout, stderr: msg.message })
          }
        }

        worker.onerror = (e) => {
          if (loadTimeoutId !== null) clearTimeout(loadTimeoutId)
          if (execTimeoutId !== null) clearTimeout(execTimeoutId)
          setIsLoading(false)
          const errMsg = e.message || 'Error en el worker de ejecución'
          setLoadError(errMsg)
          terminateWorker()
          reject(new Error(errMsg))
        }

        // Warm worker: Pyodide already loaded — send code immediately
        if (isWarm) {
          startExecTimeout()
          worker.postMessage({ code, stdin })
        }
      })

      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { stdout: '', stderr: msg }
    } finally {
      setIsRunning(false)
      setIsLoading(false)
      runningRef.current = false
    }
  }, [terminateWorker])

  return { runCode, isLoading, isRunning, loadError }
}
