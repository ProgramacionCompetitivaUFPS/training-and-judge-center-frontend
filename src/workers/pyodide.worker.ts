/// <reference lib="webworker" />

declare function importScripts(...urls: string[]): void

interface PyodideInterface {
  setStdin: (options: { stdin: () => string | undefined }) => void
  setStdout: (options: { batched: (text: string) => void }) => void
  setStderr: (options: { batched: (text: string) => void }) => void
  runPythonAsync: (code: string) => Promise<unknown>
}

declare function loadPyodide(): Promise<PyodideInterface>

// Load Pyodide once when the worker starts; subsequent runCode calls reuse the instance.
let pyodide: PyodideInterface | null = null
;(async () => {
  try {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js')
    pyodide = await loadPyodide()
    self.postMessage({ type: 'ready' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    self.postMessage({ type: 'loadError', message })
  }
})()

self.onmessage = async (e: MessageEvent<{ code: string; stdin?: string }>) => {
  if (!pyodide) {
    self.postMessage({ type: 'execError', message: 'Pyodide no está listo', stdout: '', stderr: '' })
    return
  }

  const { code, stdin } = e.data
  let stdout = ''
  let stderr = ''

  try {
    const raw = (stdin ?? '').replace(/\r\n/g, '\n')
    const stdinLines = raw === '' ? [] : raw.trimEnd().split('\n')
    let stdinIndex = 0
    pyodide.setStdin({
      stdin: () => {
        if (stdinIndex < stdinLines.length) return stdinLines[stdinIndex++]
        return undefined
      },
    })
    pyodide.setStdout({ batched: (text: string) => { stdout += text + '\n' } })
    pyodide.setStderr({ batched: (text: string) => { stderr += text + '\n' } })

    await pyodide.runPythonAsync(code)
    self.postMessage({ type: 'result', stdout: stdout.trimEnd(), stderr: stderr.trimEnd() })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    self.postMessage({ type: 'execError', message, stdout: stdout.trimEnd(), stderr: stderr.trimEnd() })
  }
}
