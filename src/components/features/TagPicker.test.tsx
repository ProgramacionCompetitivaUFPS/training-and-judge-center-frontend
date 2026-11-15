import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagPicker } from './TagPicker'

// jsdom does not implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

function renderPicker(options: string[], value: string[] = []) {
  const onChange = vi.fn()
  render(<TagPicker options={options} value={value} onChange={onChange} />)
  return { onChange }
}

describe('TagPicker', () => {
  it('shows all options when focused with no query', async () => {
    const user = userEvent.setup()
    renderPicker(['graph', 'dp', 'greedy'])

    await user.click(screen.getByRole('combobox'))

    expect(screen.getByRole('option', { name: 'graph' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'dp' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'greedy' })).toBeInTheDocument()
  })

  it('filters options case-insensitively', async () => {
    const user = userEvent.setup()
    renderPicker(['Graph', 'DP', 'Greedy'])

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByRole('combobox'), 'graph')

    expect(screen.getByRole('option', { name: 'Graph' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'DP' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Greedy' })).not.toBeInTheDocument()
  })

  it('calls onChange when an option is clicked', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker(['graph', 'dp'])

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'graph' }))

    expect(onChange).toHaveBeenCalledWith(['graph'])
  })

  it('shows "ya está agregado" error when typing a duplicate case-insensitively and pressing Enter', async () => {
    const user = userEvent.setup()
    renderPicker(['Graph', 'DP'], ['Graph'])

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByRole('combobox'), 'graph')
    await user.keyboard('{Enter}')

    expect(screen.getByRole('alert')).toHaveTextContent(/ya está agregado/i)
  })

  it('shows already-selected tags with remove button', () => {
    renderPicker(['graph', 'dp'], ['graph'])

    expect(screen.getByRole('list', { name: /tags elegidos/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /quitar el tag graph/i })).toBeInTheDocument()
  })
})
