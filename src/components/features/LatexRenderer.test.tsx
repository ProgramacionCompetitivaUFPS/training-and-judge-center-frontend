import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { LatexRenderer } from './LatexRenderer'

// KaTeX puts the TeX source of each formula in an <annotation> inside its MathML output.
const formulas = () => Array.from(document.querySelectorAll('annotation')).map((a) => a.textContent)

describe('LatexRenderer', () => {
  it('muestra el texto plano tal cual', () => {
    render(<LatexRenderer content="Dados dos enteros, imprime su suma." />)

    expect(screen.getByText('Dados dos enteros, imprime su suma.')).toBeInTheDocument()
    expect(formulas()).toEqual([])
  })

  it('renderiza una fórmula en línea entre $...$ y conserva el texto que la rodea', () => {
    render(<LatexRenderer content="Sea $x^2$ el cuadrado de x." />)

    expect(formulas()).toEqual(['x^2'])
    expect(document.querySelector('math[display="block"]')).toBeNull()
    expect(screen.getByText(/Sea/)).toBeInTheDocument()
    expect(screen.getByText(/el cuadrado de x\./)).toBeInTheDocument()
  })

  it('renderiza una fórmula en bloque entre $$...$$', () => {
    render(<LatexRenderer content={'$$\\sum_{i=1}^{n} i$$'} />)

    expect(formulas()).toEqual(['\\sum_{i=1}^{n} i'])
    expect(document.querySelector('math[display="block"]')).not.toBeNull()
  })

  it('renderiza varias fórmulas en el mismo texto, cada una en su lugar', () => {
    render(<LatexRenderer content="Con $a$ y $b$ se obtiene $$a+b$$" />)

    expect(formulas()).toEqual(['a', 'b', 'a+b'])
  })

  it('escapa el HTML del texto en vez de interpretarlo', () => {
    render(<LatexRenderer content={'1 < 2 & <img src=x onerror=alert(1)>'} />)

    expect(screen.getByText('1 < 2 & <img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('convierte los saltos de línea del texto en <br>', () => {
    const { container } = render(<LatexRenderer content={'línea 1\nlínea 2'} />)

    expect(container.querySelectorAll('br')).toHaveLength(1)
    expect(container).toHaveTextContent('línea 1línea 2')
  })

  it('no lanza con una fórmula inválida y deja visible el resto del texto', () => {
    render(<LatexRenderer content={'Texto $\\frac{1}{$ final'} />)

    expect(screen.getByText(/Texto/)).toBeInTheDocument()
    expect(screen.getByText(/final/)).toBeInTheDocument()
  })

  it('no trata un signo $ suelto como una fórmula', () => {
    render(<LatexRenderer content="Cuesta 5$ y nada más" />)

    expect(screen.getByText('Cuesta 5$ y nada más')).toBeInTheDocument()
    expect(formulas()).toEqual([])
  })

  it('aplica la clase indicada al contenedor', () => {
    const { container } = render(<LatexRenderer content="x" className="mi-clase" />)

    expect(container.firstElementChild).toHaveClass('mi-clase')
  })
})
