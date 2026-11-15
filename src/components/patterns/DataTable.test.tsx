import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { DataTable, type Column } from './DataTable'

interface Item {
  id: string
  title: string
  author: string
}

const ITEMS: Item[] = [
  { id: 'a1', title: 'First item', author: 'ana' },
  { id: 'b2', title: 'Second item', author: 'beto' },
  { id: 'c3', title: 'Third item', author: 'carla' },
]

const COLUMNS: Column<Item>[] = [
  { key: 'title', label: 'Título' },
  { key: 'author', label: 'Autor' },
]

function Destination() {
  return <div data-testid="destination">{useLocation().pathname}</div>
}

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Item>>> = {}) {
  return render(
    <MemoryRouter initialEntries={['/list']}>
      <Routes>
        <Route
          path="/list"
          element={<DataTable<Item> columns={COLUMNS} data={ITEMS} getRowHref={(i) => `/items/${i.id}`} {...props} />}
        />
        <Route path="/items/:id" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DataTable row links', () => {
  const user = userEvent.setup()

  it('gives each row its own link in the main cell', () => {
    // Arrange / Act
    renderTable()

    // Assert: every row points to its own URL (no row's link ends up on another)
    expect(screen.getByRole('link', { name: 'First item' })).toHaveAttribute('href', '/items/a1')
    expect(screen.getByRole('link', { name: 'Second item' })).toHaveAttribute('href', '/items/b2')
    expect(screen.getByRole('link', { name: 'Third item' })).toHaveAttribute('href', '/items/c3')
  })

  it('opens that row when a cell other than the link is clicked', async () => {
    // Arrange
    renderTable()

    // Act
    await user.click(screen.getByText('beto'))

    // Assert
    expect(screen.getByTestId('destination')).toHaveTextContent('/items/b2')
  })

  it('does not navigate when a selection checkbox is clicked', async () => {
    // Arrange
    const onSelectionChange = vi.fn()
    renderTable({ selectable: true, onSelectionChange })

    // Act
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar elemento b2' }))

    // Assert
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['b2']))
    expect(screen.queryByTestId('destination')).not.toBeInTheDocument()
  })

  it('does not make rows clickable when there is no getRowHref', async () => {
    // Arrange
    renderTable({ getRowHref: undefined })

    // Act
    await user.click(screen.getByText('beto'))

    // Assert
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByTestId('destination')).not.toBeInTheDocument()
  })
})
