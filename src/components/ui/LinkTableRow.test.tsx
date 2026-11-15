import { describe, it, expect, vi, afterEach } from 'vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

import { LinkTableRow } from './LinkTableRow'
import { RowLink } from './RowLink'
import { Table, TableBody, TableCell } from './Table'

function Destination() {
  const location = useLocation()
  return <div data-testid="destination">{location.pathname}|{JSON.stringify(location.state)}</div>
}

function renderRow() {
  return render(
    <MemoryRouter initialEntries={['/list']}>
      <Routes>
        <Route
          path="/list"
          element={
            <Table>
              <TableBody>
                <LinkTableRow to="/items/42" state={{ from: 'list' }}>
                  <TableCell>
                    <RowLink to="/items/42" overlay={false}>Item 42</RowLink>
                  </TableCell>
                  <TableCell>other cell</TableCell>
                  <TableCell>
                    <button type="button">Action</button>
                  </TableCell>
                </LinkTableRow>
              </TableBody>
            </Table>
          }
        />
        <Route path="/items/42" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LinkTableRow', () => {
  const user = userEvent.setup()

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates with its state when any non-interactive cell is clicked', async () => {
    // Arrange
    renderRow()

    // Act
    await user.click(screen.getByText('other cell'))

    // Assert
    expect(screen.getByTestId('destination')).toHaveTextContent('/items/42|{"from":"list"}')
  })

  it('keeps a real link with the right href in the main cell', () => {
    // Arrange / Act
    renderRow()

    // Assert
    expect(screen.getByRole('link', { name: 'Item 42' })).toHaveAttribute('href', '/items/42')
  })

  it('does not stretch an overlay when overlay is off', () => {
    // Arrange / Act
    renderRow()

    // Assert
    expect(screen.getByRole('link', { name: 'Item 42' }).className).not.toContain('after:absolute')
  })

  it('does not navigate when an inner button is clicked', async () => {
    // Arrange
    renderRow()

    // Act
    await user.click(screen.getByRole('button', { name: 'Action' }))

    // Assert
    expect(screen.queryByTestId('destination')).not.toBeInTheDocument()
  })

  it('opens a new tab instead of navigating on Ctrl+click', async () => {
    // Arrange
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderRow()

    // Act
    await user.keyboard('{Control>}')
    await user.click(screen.getByText('other cell'))
    await user.keyboard('{/Control}')

    // Assert
    expect(open).toHaveBeenCalledWith('/items/42', '_blank', 'noopener,noreferrer')
    expect(screen.queryByTestId('destination')).not.toBeInTheDocument()
  })

  it('opens a new tab on middle click', async () => {
    // Arrange
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderRow()

    // Act
    await user.pointer({ keys: '[MouseMiddle]', target: screen.getByText('other cell') })

    // Assert
    expect(open).toHaveBeenCalledWith('/items/42', '_blank', 'noopener,noreferrer')
  })
})
