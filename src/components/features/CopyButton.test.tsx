import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyButton } from './CopyButton'

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

describe('CopyButton', () => {
  beforeEach(() => {
    mockToast.mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('copia exactamente el texto, incluidos los saltos de línea', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<CopyButton text={'4 9\n2 7 11 15'} label="Copiar entrada" />)

    // Act
    await user.click(screen.getByRole('button', { name: 'Copiar entrada' }))

    // Assert
    expect(await navigator.clipboard.readText()).toBe('4 9\n2 7 11 15')
  })

  it('no recorta espacios ni saltos de línea al final', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<CopyButton text={'  1 2 \n'} label="Copiar entrada" />)

    // Act
    await user.click(screen.getByRole('button', { name: 'Copiar entrada' }))

    // Assert
    expect(await navigator.clipboard.readText()).toBe('  1 2 \n')
  })

  it('usa el label recibido como nombre accesible del botón', () => {
    render(<CopyButton text="0 1" label="Copiar salida del ejemplo 1" />)

    expect(screen.getByRole('button', { name: 'Copiar salida del ejemplo 1' })).toHaveAttribute('type', 'button')
  })

  it('cambia a "Copiado" tras copiar y vuelve a "Copiar" a los 2 segundos', async () => {
    // Arrange
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ delay: null })
    render(<CopyButton text="0 1" label="Copiar salida" />)
    expect(screen.getByTitle('Copiar')).toBeInTheDocument()

    // Act
    await user.click(screen.getByRole('button', { name: 'Copiar salida' }))

    // Assert
    expect(screen.getByTitle('Copiado')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(screen.getByTitle('Copiado')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(screen.getByTitle('Copiar')).toBeInTheDocument()
    expect(screen.queryByTitle('Copiado')).not.toBeInTheDocument()
  })

  it('no confirma "Copiado" para un texto distinto del que se copió', async () => {
    // Arrange
    const user = userEvent.setup()
    const { rerender } = render(<CopyButton text="A" label="Copiar salida" />)
    await user.click(screen.getByRole('button', { name: 'Copiar salida' }))
    expect(screen.getByTitle('Copiado')).toBeInTheDocument()

    // Act
    rerender(<CopyButton text="B" label="Copiar salida" />)

    // Assert
    expect(screen.getByTitle('Copiar')).toBeInTheDocument()
    expect(screen.queryByTitle('Copiado')).not.toBeInTheDocument()
  })

  it('muestra un toast de error y sigue en "Copiar" si el portapapeles falla', async () => {
    // Arrange
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    render(<CopyButton text="0 1" label="Copiar salida" />)

    // Act
    await user.click(screen.getByRole('button', { name: 'Copiar salida' }))

    // Assert
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'error',
      title: 'No se pudo copiar',
      description: 'El navegador no permitió acceder al portapapeles.',
    })
    expect(screen.getByTitle('Copiar')).toBeInTheDocument()
    expect(screen.queryByTitle('Copiado')).not.toBeInTheDocument()
  })

  it('no actualiza el estado ni falla al desmontar antes de que venza el temporizador', async () => {
    // Arrange
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ delay: null })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = render(<CopyButton text="0 1" label="Copiar salida" />)
    await user.click(screen.getByRole('button', { name: 'Copiar salida' }))

    // Act
    unmount()
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    // Assert
    expect(vi.getTimerCount()).toBe(0)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
