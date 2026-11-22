import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'

import CodeBlockViewer from './CodeBlockViewer'
import CodeEditor from './CodeEditor'

// With a language mode CodeMirror wraps each token in a <span> to colour it (the parse finishes shortly after
// the first paint); without one the line stays plain text.
const highlightedTokens = () => screen.getByRole('textbox').querySelectorAll('span').length
const expectHighlighted = () => waitFor(() => expect(highlightedTokens()).toBeGreaterThan(0))
const letParseFinish = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))

describe('CodeBlockViewer', () => {
  it('muestra el contenido recibido con su etiqueta accesible', () => {
    render(<CodeBlockViewer value={'3 5\n8'} ariaLabel="Entrada del caso 01" />)

    expect(screen.getByLabelText('Entrada del caso 01')).toBeInTheDocument()
    expect(screen.getByText('3 5')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('es de solo lectura', () => {
    render(<CodeBlockViewer value="print(1)" mode="python" ariaLabel="Solución" />)

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-readonly', 'true')
  })

  it('no abre el teclado en móviles (inputmode none)', () => {
    render(<CodeBlockViewer value="x" ariaLabel="Código" />)

    expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'none')
  })

  it.each([['cpp'], ['java'], ['python']] as const)('resalta la sintaxis con el modo %s', async (mode) => {
    render(<CodeBlockViewer value="x = 1" mode={mode} ariaLabel="Código" />)

    await expectHighlighted()
    expect(screen.getByRole('textbox')).toHaveTextContent('x = 1')
  })

  it('no resalta nada cuando no se indica modo', async () => {
    render(<CodeBlockViewer value="x = 1" ariaLabel="Código" />)

    await letParseFinish()

    expect(highlightedTokens()).toBe(0)
  })
})

describe('CodeEditor', () => {
  it('muestra el código recibido en un editor editable', () => {
    render(<CodeEditor value="int main() {}" onChange={vi.fn()} language="cpp20" />)

    expect(screen.getByLabelText('Editor de código')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveTextContent('int main() {}')
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-readonly', 'true')
  })

  it('muestra el placeholder cuando el editor está vacío', () => {
    render(<CodeEditor value="" onChange={vi.fn()} language="python310" placeholder="Escribe tu solución" />)

    expect(screen.getByText('Escribe tu solución')).toBeInTheDocument()
  })

  it.each([['cpp20'], ['java17'], ['python310'], ['blockly']])('resalta la sintaxis para el lenguaje %s', async (language) => {
    render(<CodeEditor value="x = 1" onChange={vi.fn()} language={language} />)

    await expectHighlighted()
    expect(screen.getByRole('textbox')).toHaveTextContent('x = 1')
  })

  it('no resalta nada para un lenguaje desconocido', async () => {
    render(<CodeEditor value="x = 1" onChange={vi.fn()} language="desconocido" />)

    await letParseFinish()

    expect(highlightedTokens()).toBe(0)
  })
})
