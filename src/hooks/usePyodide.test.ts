import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { usePyodide } from './usePyodide'

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'loadError'; message: string }
  | { type: 'result'; stdout: string; stderr: string }
  | { type: 'execError'; message: string; stdout: string; stderr: string }

class FakeWorker {
  static instances: FakeWorker[] = []
  static failOnCreate: Error | null = null

  onmessage: ((e: MessageEvent<WorkerMessage>) => void) | null = null
  onerror: ((e: { message: string }) => void) | null = null
  posted: Array<{ code: string; stdin?: string }> = []
  terminated = false

  constructor() {
    if (FakeWorker.failOnCreate) throw FakeWorker.failOnCreate
    FakeWorker.instances.push(this)
  }

  postMessage(message: { code: string; stdin?: string }) {
    this.posted.push(message)
  }

  terminate() {
    this.terminated = true
  }

  emit(message: WorkerMessage) {
    this.onmessage?.({ data: message } as MessageEvent<WorkerMessage>)
  }

  crash(message: string) {
    this.onerror?.({ message })
  }
}

type RunResult = { stdout: string; stderr: string }

/** Starts a run and returns its promise; everything the hook does before its first await has happened by then. */
function startRun(result: { current: ReturnType<typeof usePyodide> }, code: string, stdin?: string) {
  let promise!: Promise<RunResult>
  act(() => {
    promise = result.current.runCode(code, stdin)
  })
  return promise
}

async function settle(promise: Promise<RunResult>) {
  let value!: RunResult
  await act(async () => {
    value = await promise
  })
  return value
}

beforeEach(() => {
  FakeWorker.instances = []
  FakeWorker.failOnCreate = null
  vi.stubGlobal('Worker', FakeWorker)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('usePyodide', () => {
  it('carga Pyodide en un worker nuevo, ejecuta el código con su stdin y devuelve la salida', async () => {
    const { result } = renderHook(() => usePyodide())

    const run = startRun(result, 'print(1)', '5\n')
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isRunning).toBe(true)
    const worker = FakeWorker.instances[0]
    act(() => worker.emit({ type: 'ready' }))
    expect(worker.posted).toEqual([{ code: 'print(1)', stdin: '5\n' }])
    act(() => worker.emit({ type: 'result', stdout: '1\n', stderr: '' }))
    const output = await settle(run)

    expect(output).toEqual({ stdout: '1\n', stderr: '' })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isRunning).toBe(false)
    expect(worker.terminated).toBe(false)
  })

  it('reutiliza el worker ya cargado en la segunda ejecución sin volver a cargar Pyodide', async () => {
    const { result } = renderHook(() => usePyodide())
    const first = startRun(result, 'print(1)')
    const worker = FakeWorker.instances[0]
    act(() => worker.emit({ type: 'ready' }))
    act(() => worker.emit({ type: 'result', stdout: '1\n', stderr: '' }))
    await settle(first)

    const second = startRun(result, 'print(2)')
    expect(result.current.isLoading).toBe(false)
    act(() => worker.emit({ type: 'result', stdout: '2\n', stderr: '' }))
    const output = await settle(second)

    expect(FakeWorker.instances).toHaveLength(1)
    expect(worker.posted.map((m) => m.code)).toEqual(['print(1)', 'print(2)'])
    expect(output).toEqual({ stdout: '2\n', stderr: '' })
  })

  it('rechaza una segunda ejecución mientras hay una en curso sin crear otro worker', async () => {
    const { result } = renderHook(() => usePyodide())
    const first = startRun(result, 'while True: pass')

    const second = await settle(startRun(result, 'print(2)'))

    expect(second).toEqual({ stdout: '', stderr: 'Ya hay una ejecución en curso' })
    expect(FakeWorker.instances).toHaveLength(1)
    const worker = FakeWorker.instances[0]
    act(() => worker.emit({ type: 'ready' }))
    act(() => worker.emit({ type: 'result', stdout: '', stderr: '' }))
    await settle(first)
  })

  it('un error de Python devuelve el mensaje como stderr y conserva el worker para la siguiente ejecución', async () => {
    const { result } = renderHook(() => usePyodide())
    const run = startRun(result, '1/0')
    const worker = FakeWorker.instances[0]
    act(() => worker.emit({ type: 'ready' }))
    act(() => worker.emit({ type: 'execError', message: 'ZeroDivisionError: division by zero', stdout: 'antes\n', stderr: '' }))

    const output = await settle(run)

    expect(output).toEqual({ stdout: 'antes\n', stderr: 'ZeroDivisionError: division by zero' })
    expect(worker.terminated).toBe(false)
    const next = startRun(result, 'print(3)')
    expect(FakeWorker.instances).toHaveLength(1)
    expect(worker.posted[1].code).toBe('print(3)')
    act(() => worker.emit({ type: 'result', stdout: '3\n', stderr: '' }))
    await settle(next)
  })

  it('un error de carga fija loadError, termina el worker y devuelve el mensaje', async () => {
    const { result } = renderHook(() => usePyodide())
    const run = startRun(result, 'print(1)')
    const worker = FakeWorker.instances[0]
    act(() => worker.emit({ type: 'loadError', message: 'No se pudo descargar Pyodide' }))

    const output = await settle(run)

    expect(output).toEqual({ stdout: '', stderr: 'No se pudo descargar Pyodide' })
    expect(result.current.loadError).toBe('No se pudo descargar Pyodide')
    expect(worker.terminated).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('termina el worker y avisa si Pyodide no carga en 30 segundos', async () => {
    const { result } = renderHook(() => usePyodide())
    const run = startRun(result, 'print(1)')
    const worker = FakeWorker.instances[0]

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    const output = await settle(run)

    expect(output).toEqual({ stdout: '', stderr: 'Tiempo límite de carga excedido' })
    expect(worker.terminated).toBe(true)
  })

  it('no vence por carga si Pyodide responde antes de los 30 segundos', async () => {
    const { result } = renderHook(() => usePyodide())
    const run = startRun(result, 'print(1)')
    const worker = FakeWorker.instances[0]
    await act(async () => {
      await vi.advanceTimersByTimeAsync(29_000)
    })
    act(() => worker.emit({ type: 'ready' }))
    act(() => worker.emit({ type: 'result', stdout: '1\n', stderr: '' }))

    const output = await settle(run)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    expect(output).toEqual({ stdout: '1\n', stderr: '' })
    expect(worker.terminated).toBe(false)
  })

  it('termina el worker si el código tarda más de 5 segundos y crea uno nuevo en la siguiente ejecución', async () => {
    const { result } = renderHook(() => usePyodide())
    const run = startRun(result, 'while True: pass')
    const worker = FakeWorker.instances[0]
    act(() => worker.emit({ type: 'ready' }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    const output = await settle(run)

    expect(output).toEqual({ stdout: '', stderr: 'Tiempo límite excedido' })
    expect(worker.terminated).toBe(true)
    const next = startRun(result, 'print(1)')
    expect(FakeWorker.instances).toHaveLength(2)
    const fresh = FakeWorker.instances[1]
    act(() => fresh.emit({ type: 'ready' }))
    act(() => fresh.emit({ type: 'result', stdout: '1\n', stderr: '' }))
    await settle(next)
  })

  it('un fallo del worker fija loadError, lo termina y devuelve el mensaje', async () => {
    const { result } = renderHook(() => usePyodide())
    const run = startRun(result, 'print(1)')
    const worker = FakeWorker.instances[0]
    act(() => worker.crash('Script error'))

    const output = await settle(run)

    expect(output).toEqual({ stdout: '', stderr: 'Script error' })
    expect(result.current.loadError).toBe('Script error')
    expect(worker.terminated).toBe(true)
  })

  it('devuelve el error y libera el estado si no se puede crear el worker', async () => {
    FakeWorker.failOnCreate = new Error('Workers no soportados')
    const { result } = renderHook(() => usePyodide())

    const output = await settle(startRun(result, 'print(1)'))

    expect(output).toEqual({ stdout: '', stderr: 'Workers no soportados' })
    expect(result.current.loadError).toBe('Workers no soportados')
    expect(result.current.isRunning).toBe(false)
  })

  it('termina el worker al desmontar el componente', async () => {
    const { result, unmount } = renderHook(() => usePyodide())
    const run = startRun(result, 'print(1)')
    const worker = FakeWorker.instances[0]
    act(() => worker.emit({ type: 'ready' }))
    act(() => worker.emit({ type: 'result', stdout: '1\n', stderr: '' }))
    await settle(run)

    unmount()

    expect(worker.terminated).toBe(true)
  })
})
