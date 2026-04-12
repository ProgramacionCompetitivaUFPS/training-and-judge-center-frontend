// Feature: frontend-testing, Property 15: Escape key closes dismissible components
// **Validates: Requirements 11.1, 11.2**

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fc from 'fast-check'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './Dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './Dropdown'

// ---------- Test helpers ----------

function TestDialog({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button>Open Dialog</button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Test Dialog</DialogTitle>
        <DialogDescription>Dialog description</DialogDescription>
        <input placeholder="First input" />
        <input placeholder="Second input" />
        <button>Action</button>
      </DialogContent>
    </Dialog>
  )
}

function TestDropdown({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button>Open Menu</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Item 1</DropdownMenuItem>
        <DropdownMenuItem>Item 2</DropdownMenuItem>
        <DropdownMenuItem>Item 3</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


// ---------- 12.1 Unit tests: Dialog focus trap and Escape key ----------

describe('Dialog accessibility', () => {
  describe('focus trap', () => {
    it('traps keyboard focus within the dialog when open', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)

      // Open the dialog
      await user.click(screen.getByText('Open Dialog'))

      // Dialog should be visible
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Tab through focusable elements inside the dialog
      // Radix Dialog traps focus — tabbing should cycle within dialog boundaries
      const dialog = screen.getByRole('dialog')
      const focusableElements = dialog.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])'
      )

      // There should be focusable elements inside the dialog
      expect(focusableElements.length).toBeGreaterThan(0)

      // Tab multiple times — focus should stay within the dialog
      for (let i = 0; i < focusableElements.length + 2; i++) {
        await user.tab()
        expect(dialog.contains(document.activeElement)).toBe(true)
      }
    })
  })

  describe('Escape key', () => {
    it('closes the dialog when Escape is pressed', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)

      const trigger = screen.getByText('Open Dialog')
      await user.click(trigger)
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Press Escape
      await user.keyboard('{Escape}')

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('returns focus to the trigger after Escape closes the dialog', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)

      const trigger = screen.getByText('Open Dialog')
      await user.click(trigger)
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      // Focus should return to the trigger
      expect(trigger).toHaveFocus()
    })
  })
})

describe('Dropdown accessibility', () => {
  describe('Escape key', () => {
    it('closes the dropdown when Escape is pressed', async () => {
      const user = userEvent.setup()
      render(<TestDropdown />)

      const trigger = screen.getByText('Open Menu')
      await user.click(trigger)

      // Menu items should be visible
      expect(screen.getByText('Item 1')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
      })
    })

    it('returns focus to the trigger after Escape closes the dropdown', async () => {
      const user = userEvent.setup()
      render(<TestDropdown />)

      const trigger = screen.getByText('Open Menu')
      await user.click(trigger)
      expect(screen.getByText('Item 1')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
      })

      expect(trigger).toHaveFocus()
    })
  })
})


// ---------- 12.2 Property test: Escape key closes dismissible components ----------

type DismissibleType = 'Dialog' | 'Dropdown'

const dismissibleComponents: DismissibleType[] = ['Dialog', 'Dropdown']

describe('Property 15: Escape key closes dismissible components', () => {
  it('pressing Escape closes the component and returns focus to trigger', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...dismissibleComponents), async (componentType) => {
        const user = userEvent.setup()

        const { unmount } = render(
          componentType === 'Dialog'
            ? <TestDialog />
            : <TestDropdown />
        )

        const triggerText = componentType === 'Dialog' ? 'Open Dialog' : 'Open Menu'
        const trigger = screen.getByText(triggerText)

        // Open the component
        await user.click(trigger)

        // Verify it opened
        if (componentType === 'Dialog') {
          await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument()
          })
        } else {
          await waitFor(() => {
            expect(screen.getByText('Item 1')).toBeInTheDocument()
          })
        }

        // Press Escape
        await user.keyboard('{Escape}')

        // Verify it closed
        if (componentType === 'Dialog') {
          await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
          })
        } else {
          await waitFor(() => {
            expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
          })
        }

        // Verify focus returned to trigger
        expect(trigger).toHaveFocus()

        unmount()
      }),
      { numRuns: 10 },
    )
  })
})
