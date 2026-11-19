import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithRouter } from '@/test/renderWithProviders'
import type { ContestProblem } from '@/types/contest'

import { ContestProblemsTable } from './ContestProblemsTable'

const problems: ContestProblem[] = [
  { position: 1, slug: 'two-sum', title: 'Two Sum', timeLimit: 2000, memoryLimit: 256, color: '#e11d48' },
  { position: 2, slug: 'binary-search', title: 'Binary Search', timeLimit: 1000, memoryLimit: 128, color: null },
]

function renderTable(props: Partial<React.ComponentProps<typeof ContestProblemsTable>> = {}) {
  return renderWithRouter(
    <ContestProblemsTable problems={problems} groupId="group-1" contestId="contest-2" {...props} />,
  )
}

describe('ContestProblemsTable', () => {
  it('muestra cada problema con su globo de color y su letra', () => {
    renderTable()

    const first = screen.getByRole('img', { name: 'Problema A' })
    const second = screen.getByRole('img', { name: 'Problema B' })
    expect(within(first).getByTestId('balloon-icon-body')).toHaveAttribute('fill', '#e11d48')
    expect(within(first).getByTestId('balloon-icon-letter')).toHaveTextContent('A')
    expect(within(second).getByTestId('balloon-icon-body')).toHaveAttribute('fill', '#ffffff')
    expect(screen.getByRole('link', { name: 'Two Sum' })).toBeInTheDocument()
  })

  it('muestra los límites de cada problema con su unidad', () => {
    renderTable()

    expect(screen.getByText('2000ms')).toBeInTheDocument()
    expect(screen.getByText('256 MiB')).toBeInTheDocument()
    expect(screen.getByText('1000ms')).toBeInTheDocument()
    expect(screen.getByText('128 MiB')).toBeInTheDocument()
  })

  it('muestra — en lugar de los límites cuando todavía no se conocen (problema recién agregado)', () => {
    renderTable({ problems: [{ position: 3, slug: 'graph-bfs', title: 'Graph BFS', color: null }] })

    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument()
  })

  it('no ofrece cambiar el color cuando no se pasa onColorChange', () => {
    renderTable()

    expect(screen.queryByRole('button', { name: 'Color del problema A' })).not.toBeInTheDocument()
  })

  it('con onColorChange permite elegir un color y lo reporta con el slug del problema', async () => {
    // Arrange
    const user = userEvent.setup()
    const onColorChange = vi.fn()
    renderTable({ onColorChange })

    // Act
    await user.click(screen.getByRole('button', { name: 'Color del problema B' }))
    await user.click(await screen.findByRole('button', { name: '#7c3aed' }))

    // Assert
    expect(onColorChange).toHaveBeenCalledTimes(1)
    expect(onColorChange).toHaveBeenCalledWith('binary-search', '#7c3aed')
  })

  it('reporta el blanco cuando se restablece el color', async () => {
    const user = userEvent.setup()
    const onColorChange = vi.fn()
    renderTable({ onColorChange })

    await user.click(screen.getByRole('button', { name: 'Color del problema A' }))
    await user.click(await screen.findByRole('button', { name: 'Restablecer a blanco' }))

    expect(onColorChange).toHaveBeenCalledWith('two-sum', '#ffffff')
  })

  it('deshabilita los globos cuando colorsDisabled es true', () => {
    renderTable({ onColorChange: vi.fn(), colorsDisabled: true })

    expect(screen.getByRole('button', { name: 'Color del problema A' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Color del problema B' })).toBeDisabled()
  })

  it('muestra el mensaje vacío cuando no hay problemas', () => {
    renderTable({ problems: [] })

    expect(screen.getByText('No hay problemas disponibles.')).toBeInTheDocument()
  })
})
