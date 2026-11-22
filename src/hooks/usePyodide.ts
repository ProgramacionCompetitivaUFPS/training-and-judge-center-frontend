import { useState, useCallback, useRef, useEffect } from 'react'

type RunOutput = { stdout: string; stderr: string }

interface UsePyodideReturn {
  runCode: (code: string, stdin?: string) => Promise<RunOutput>
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

/** What a run needs from the hook that owns the worker. */
interface RunCallbacks {
  terminateWorker: () => void
  setIsLoading: (loading: boolean) => void
  setLoadError: (message: string) => void
  markReady: () => void
}

/**
 * Sends the code to the worker and waits for its answer. A cold worker has 30 s to load Pyodide; once it is
 * ready (or if it was already warm) the code has 5 s to run before the worker is terminated.
 */
function runInWorker(worker: Worker, isWarm: boolean, code: string, stdin: string | undefined, callbacks: RunCallbacks): Promise<RunOutput> {
  return new Promise((resolve, reject) => {
    let loadTimeoutId: ReturnType<typeof setTimeout> | null = null
    let execTimeoutId: ReturnType<typeof setTimeout> | null = null

    const stopLoadTimer = () => {
      if (loadTimeoutId !== null) clearTimeout(loadTimeoutId)
      loadTimeoutId = null
    }
    const stopExecTimer = () => {
      if (execTimeoutId !== null) clearTimeout(execTimeoutId)
      execTimeoutId = null
    }
    const failAfterTimeout = (message: string) => () => {
      callbacks.terminateWorker()
      reject(new Error(message))
    }
    const startExecTimer = () => {
      execTimeoutId = setTimeout(failAfterTimeout('Tiempo límite excedido'), EXECUTION_TIMEOUT)
    }
    const runNow = () => {
      startExecTimer()
      worker.postMessage({ code, stdin })
    }

    const handleMessage = (msg: WorkerMessage) => {
      switch (msg.type) {
        case 'ready':
          callbacks.markReady()
          stopLoadTimer()
          callbacks.setIsLoading(false)
          runNow()
          break
        case 'loadError':
          stopLoadTimer()
          callbacks.setIsLoading(false)
          callbacks.setLoadError(msg.message)
          callbacks.terminateWorker()
          reject(new Error(msg.message))
          break
        case 'result':
          stopExecTimer()
          resolve({ stdout: msg.stdout, stderr: msg.stderr })
          break
        case 'execError':
          stopExecTimer()
          // A Python error does not damage the runtime (each run gets fresh globals), so the worker stays:
          // making a mistake, the usual thing, must not cost another load of Pyodide. Only a run that
          // does not finish (above) can leave it stuck, and that one is terminated.
          resolve({ stdout: msg.stdout, stderr: msg.message })
          break
      }
    }

    if (!isWarm) loadTimeoutId = setTimeout(failAfterTimeout('Tiempo límite de carga excedido'), LOAD_TIMEOUT)

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => handleMessage(e.data)
    worker.onerror = (e) => {
      stopLoadTimer()
      stopExecTimer()
      callbacks.setIsLoading(false)
      const errMsg = e.message || 'Error en el worker de ejecución'
      callbacks.setLoadError(errMsg)
      callbacks.terminateWorker()
      reject(new Error(errMsg))
    }

    // Warm worker: Pyodide already loaded — send code immediately
    if (isWarm) runNow()
  })
}

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

  const runCode = useCallback(async (code: string, stdin?: string): Promise<RunOutput> => {
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

    const callbacks: RunCallbacks = {
      terminateWorker,
      setIsLoading,
      setLoadError,
      markReady: () => {
        pyodideReadyRef.current = true
      },
    }

    try {
      return await runInWorker(workerRef.current!, isWarm, code, stdin, callbacks)
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
