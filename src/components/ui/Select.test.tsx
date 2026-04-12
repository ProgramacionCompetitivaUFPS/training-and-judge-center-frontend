// Task 12.3: Keyboard navigation tests for Select
// **Validates: Requirements 11.3**

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './Select'

// Radix Select uses pointer capture and scrollIntoView which jsdom doesn't support.
// Polyfill them to prevent unhandled errors.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.setPointerCapture = vi.fn()
})

function TestSelect({ onValueChange }: { onValueChange?: (value: string) => void }) {
  return (
    <Select onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Pick a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  )
}

describe('Select keyboard navigation', () => {
  it('renders a combobox trigger with the placeholder', () => {
    render(<TestSelect />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent('Pick a fruit')
  })

  it('opens the listbox when the trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<TestSelect />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
  })

  it('opens the listbox with Space key on the trigger', async () => {
    const user = userEvent.setup()
    render(<TestSelect />)

    const trigger = screen.getByRole('combobox')
    trigger.focus()
    await user.keyboard(' ')

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
  })

  it('opens the listbox with ArrowDown key on the trigger', async () => {
    const user = userEvent.setup()
    render(<TestSelect />)

    const trigger = screen.getByRole('combobox')
    trigger.focus()
    await user.keyboard('{ArrowDown}')

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
  })

  it('navigates options with ArrowDown and selects with Enter', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<TestSelect onValueChange={onValueChange} />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Navigate down and select
    await user.keyboard('{ArrowDown}{Enter}')

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalled()
    })
  })

  it('navigates options with ArrowUp and selects with Enter', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<TestSelect onValueChange={onValueChange} />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Navigate down twice then up, then select
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{Enter}')

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalled()
    })
  })

  it('closes the listbox after selecting an item and updates the trigger text', async () => {
    const user = userEvent.setup()
    render(<TestSelect />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Click an option
    await user.click(screen.getByText('Banana'))

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    expect(trigger).toHaveTextContent('Banana')
  })
})
