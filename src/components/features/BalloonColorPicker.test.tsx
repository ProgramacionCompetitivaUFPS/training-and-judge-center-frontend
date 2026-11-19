import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { BalloonColorPicker } from './BalloonColorPicker'

function renderPicker(props: Partial<React.ComponentProps<typeof BalloonColorPicker>> = {}) {
  const onChange = vi.fn()
  render(<BalloonColorPicker letter="A" title="Watermelon" color="#e11d48" onChange={onChange} {...props} />)
  return { onChange }
}

describe('BalloonColorPicker', () => {
  it('muestra el color guardado en el chip', () => {
    renderPicker({ color: '#E11D48' })

    expect(screen.getByRole('button', { name: 'Color del problema A' })).toHaveTextContent('#e11d48')
  })

  it.each<string | null | undefined>([null, undefined, 'red'])('muestra "Sin color" cuando el color es %j', (color) => {
    renderPicker({ color })

    expect(screen.getByRole('button', { name: 'Color del problema A' })).toHaveTextContent('Sin color')
  })

  it('abre el panel con los 12 colores sugeridos y marca el actual', async () => {
    const user = userEvent.setup()
    renderPicker({ color: '#2563eb' })

    await user.click(screen.getByRole('button', { name: 'Color del problema A' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Colores sugeridos' })).getAllByRole('button')).toHaveLength(12)
    expect(screen.getByRole('button', { name: '#2563eb' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '#e11d48' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('al elegir un color sugerido llama onChange con ese color y cierra el panel', async () => {
    // Arrange
    const user = userEvent.setup()
    const { onChange } = renderPicker()
    await user.click(screen.getByRole('button', { name: 'Color del problema A' }))

    // Act
    await user.click(await screen.findByRole('button', { name: '#7c3aed' }))

    // Assert
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('#7c3aed')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('acepta un hexadecimal personalizado y lo entrega en minúsculas', async () => {
    // Arrange
    const user = userEvent.setup()
    const { onChange } = renderPicker()
    await user.click(screen.getByRole('button', { name: 'Color del problema A' }))
    const hex = await screen.findByRole('textbox', { name: 'Código hexadecimal' })

    // Act
    await user.clear(hex)
    await user.type(hex, '#AABBCC')
    await user.click(screen.getByRole('button', { name: 'Usar' }))

    // Assert
    expect(onChange).toHaveBeenCalledWith('#aabbcc')
  })

  it('aplica el hexadecimal con Enter', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker()
    await user.click(screen.getByRole('button', { name: 'Color del problema A' }))
    const hex = await screen.findByRole('textbox', { name: 'Código hexadecimal' })

    await user.clear(hex)
    await user.type(hex, '#112233{Enter}')

    expect(onChange).toHaveBeenCalledWith('#112233')
  })

  it('al quitar el color llama onChange con null', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker()
    await user.click(screen.getByRole('button', { name: 'Color del problema A' }))

    await user.click(await screen.findByRole('button', { name: 'Quitar color' }))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it.each(['red', '#fff', '#GGGGGG', ''])('rechaza el hexadecimal inválido %j con un aviso y sin llamar onChange', async (value) => {
    // Arrange
    const user = userEvent.setup()
    const { onChange } = renderPicker()
    await user.click(screen.getByRole('button', { name: 'Color del problema A' }))
    const hex = await screen.findByRole('textbox', { name: 'Código hexadecimal' })

    // Act
    await user.clear(hex)
    if (value) await user.type(hex, value)
    await user.click(screen.getByRole('button', { name: 'Usar' }))

    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent('Usa el formato #RRGGBB')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('no abre el panel cuando está deshabilitado', async () => {
    const user = userEvent.setup()
    renderPicker({ disabled: true })

    await user.click(screen.getByRole('button', { name: 'Color del problema A' }))

    expect(screen.getByRole('button', { name: 'Color del problema A' })).toBeDisabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('en la variante de letra dibuja la letra sobre el globo', () => {
    renderPicker({ variant: 'letter' })

    expect(screen.getByTestId('balloon-icon-letter')).toHaveTextContent('A')
  })
})
