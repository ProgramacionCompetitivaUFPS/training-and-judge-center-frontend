import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
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
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates with its state when any non-interactive cell is clicked', () => {
    renderRow()
    fireEvent.click(screen.getByText('other cell'))
    expect(screen.getByTestId('destination')).toHaveTextContent('/items/42|{"from":"list"}')
  })

  it('does not navigate when an inner button is clicked', () => {
    renderRow()
    fireEvent.click(screen.getByRole('button', { name: 'Action' }))
    expect(screen.queryByTestId('destination')).not.toBeInTheDocument()
  })

  it('opens a new tab instead of navigating on Ctrl+click', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderRow()
    fireEvent.click(screen.getByText('other cell'), { ctrlKey: true })
    expect(open).toHaveBeenCalledWith('/items/42', '_blank', 'noopener')
    expect(screen.queryByTestId('destination')).not.toBeInTheDocument()
  })

  it('opens a new tab on middle click', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderRow()
    fireEvent(screen.getByText('other cell'), new MouseEvent('auxclick', { bubbles: true, button: 1 }))
    expect(open).toHaveBeenCalledWith('/items/42', '_blank', 'noopener')
  })

  it('keeps a real link with the right href in the main cell', () => {
    renderRow()
    expect(screen.getByRole('link', { name: 'Item 42' })).toHaveAttribute('href', '/items/42')
  })

  it('does not stretch an overlay when overlay is off', () => {
    renderRow()
    expect(screen.getByRole('link', { name: 'Item 42' }).className).not.toContain('after:absolute')
  })
})
