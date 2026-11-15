import { describe, it, expect } from 'vitest'
import { renderHook, render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ToastProvider } from '@/components/layout/ToastProvider'
import { useToastContext } from './useToastContext'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

describe('useToastContext', () => {
  it('lanza con el mensaje correcto cuando se usa fuera de ToastProvider', () => {
    expect(() => renderHook(() => useToastContext())).toThrow(
      'useToastContext must be used within ToastProvider',
    )
  })

  it('retorna toast, dismiss y dismissAll cuando se usa dentro de ToastProvider', () => {
    const { result } = renderHook(() => useToastContext(), { wrapper: Wrapper })

    expect(result.current.toast).toBeTypeOf('function')
    expect(result.current.dismiss).toBeTypeOf('function')
    expect(result.current.dismissAll).toBeTypeOf('function')
  })

  it('toast retorna un id de string no vacío', () => {
    const { result } = renderHook(() => useToastContext(), { wrapper: Wrapper })

    let id: string
    act(() => {
      id = result.current.toast({ variant: 'success', title: 'Operación completada' })
    })

    expect(typeof id!).toBe('string')
    expect(id!.length).toBeGreaterThan(0)
  })

  it('ids distintos para toasts distintos', () => {
    const { result } = renderHook(() => useToastContext(), { wrapper: Wrapper })

    let id1: string, id2: string
    act(() => {
      id1 = result.current.toast({ variant: 'success', title: 'A' })
      id2 = result.current.toast({ variant: 'error', title: 'B' })
    })

    expect(id1!).not.toBe(id2!)
  })

  it('dismiss elimina del DOM solo el toast cerrado', async () => {
    // duration: 0 desactiva el auto-dismiss para que no interfiera con la aserción
    function Consumer() {
      const { toast, dismiss } = useToastContext()
      const [idA, setIdA] = React.useState<string | null>(null)

      return (
        <>
          <button
            onClick={() => {
              const a = toast({ variant: 'success', title: 'Toast A', duration: 0 })
              toast({ variant: 'warning', title: 'Toast B', duration: 0 })
              setIdA(a)
            }}
          >
            Agregar
          </button>
          <button onClick={() => idA && dismiss(idA)} disabled={!idA}>
            Cerrar A
          </button>
        </>
      )
    }

    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(screen.getByText('Toast A')).toBeInTheDocument()
    expect(screen.getByText('Toast B')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar A' }))
    expect(screen.queryByText('Toast A')).not.toBeInTheDocument()
    // Toast B no se ve afectado
    expect(screen.getByText('Toast B')).toBeInTheDocument()
  })

  it('dismissAll elimina todos los toasts activos del DOM', async () => {
    function Consumer() {
      const { toast, dismissAll } = useToastContext()
      return (
        <>
          <button
            onClick={() => {
              toast({ variant: 'success', title: 'Toast A', duration: 0 })
              toast({ variant: 'error', title: 'Toast B', duration: 0 })
              toast({ variant: 'warning', title: 'Toast C', duration: 0 })
            }}
          >
            Agregar tres
          </button>
          <button onClick={dismissAll}>Cerrar todos</button>
        </>
      )
    }

    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Agregar tres' }))
    expect(screen.getByText('Toast A')).toBeInTheDocument()
    expect(screen.getByText('Toast B')).toBeInTheDocument()
    expect(screen.getByText('Toast C')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar todos' }))
    expect(screen.queryByText('Toast A')).not.toBeInTheDocument()
    expect(screen.queryByText('Toast B')).not.toBeInTheDocument()
    expect(screen.queryByText('Toast C')).not.toBeInTheDocument()
  })
})
