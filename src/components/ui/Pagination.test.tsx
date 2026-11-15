import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaginationControls, PaginationNumbers } from '@/components/ui/Pagination'

describe('PaginationControls', () => {
  it('no renderiza nada cuando totalPages es 1', () => {
    const { container } = render(
      <PaginationControls currentPage={1} totalPages={1} onPageChange={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renderiza botones Anterior y Siguiente', () => {
    render(<PaginationControls currentPage={3} totalPages={10} onPageChange={vi.fn()} />)
    expect(screen.getByLabelText('Ir a la página anterior')).toBeInTheDocument()
    expect(screen.getByLabelText('Ir a la página siguiente')).toBeInTheDocument()
  })

  it('botón Anterior está disabled cuando currentPage es 1', () => {
    render(<PaginationControls currentPage={1} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByLabelText('Ir a la página anterior')).toBeDisabled()
  })

  it('botón Siguiente está disabled cuando currentPage es totalPages', () => {
    render(<PaginationControls currentPage={5} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByLabelText('Ir a la página siguiente')).toBeDisabled()
  })

  it.each([
    { label: 'Siguiente', currentPage: 3, totalPages: 10, ariaLabel: 'Ir a la página siguiente', pageNumber: undefined, expected: 4 },
    { label: 'Anterior',  currentPage: 3, totalPages: 10, ariaLabel: 'Ir a la página anterior',  pageNumber: undefined, expected: 2 },
    { label: 'número 2',  currentPage: 1, totalPages: 3,  ariaLabel: undefined,                   pageNumber: '2',       expected: 2 },
  ])('llama onPageChange al hacer click en $label', async ({ currentPage, totalPages, ariaLabel, pageNumber, expected }) => {
    const spy = vi.fn()
    const user = userEvent.setup()
    render(<PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={spy} />)
    if (ariaLabel) {
      await user.click(screen.getByLabelText(ariaLabel))
    } else {
      await user.click(screen.getByRole('button', { name: pageNumber! }))
    }
    expect(spy).toHaveBeenCalledWith(expected)
  })
})

describe('PaginationNumbers — ellipsis', () => {
  it.each([
    {
      label: 'inicio y final: rango central muestra ellipsis en ambos extremos',
      currentPage: 8, totalPages: 15, ellipsisCount: 2, anchorPage: '1', anchorVisible: true,
    },
    {
      label: 'solo final: rango comienza desde 1',
      currentPage: 1, totalPages: 15, ellipsisCount: 1, anchorPage: '15', anchorVisible: true,
    },
    {
      label: 'ninguno: rango adyacente al extremo',
      currentPage: 4, totalPages: 6,  ellipsisCount: 0, anchorPage: null, anchorVisible: false,
    },
  ])('$label', ({ currentPage, totalPages, ellipsisCount, anchorPage, anchorVisible }) => {
    render(
      <PaginationNumbers currentPage={currentPage} totalPages={totalPages} onPageChange={vi.fn()} />,
    )
    const ellipses = screen.queryAllByText('Más páginas')
    expect(ellipses).toHaveLength(ellipsisCount)
    if (anchorVisible && anchorPage) {
      expect(screen.getByText(anchorPage)).toBeInTheDocument()
    }
  })
})
